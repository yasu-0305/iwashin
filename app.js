const video=document.querySelector("#video");
const startBtn=document.querySelector("#start");
const flipBtn=document.querySelector("#flip");
const captureBtn=document.querySelector("#capture");
const placeholder=document.querySelector("#placeholder");
const message=document.querySelector("#message");
const sticker=document.querySelector("#sticker");
const canvas=document.querySelector("#canvas");
const dialog=document.querySelector("#result");
const photo=document.querySelector("#photo");
const download=document.querySelector("#download");
const shareBtn=document.querySelector("#share");
let stream=null,facing="user",photoBlob=null;

async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){
    message.textContent="このブラウザはカメラ機能に対応していません";
    return;
  }
  stream?.getTracks().forEach(track=>track.stop());
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:false});
    video.srcObject=stream;
    video.style.transform=facing==="user"?"scaleX(-1)":"none";
    placeholder.hidden=true;
    startBtn.hidden=true;
    flipBtn.disabled=false;
    captureBtn.disabled=false;
    message.textContent="イワシんを指で動かして、好きな位置で撮影！";
  }catch(error){
    message.textContent=error.name==="NotAllowedError"
      ?"カメラが許可されていません。ブラウザの設定をご確認ください"
      :"カメラを起動できませんでした";
  }
}

startBtn.addEventListener("click",startCamera);
flipBtn.addEventListener("click",async()=>{facing=facing==="user"?"environment":"user";await startCamera()});

let drag=null;
sticker.addEventListener("pointerdown",e=>{
  const rect=sticker.getBoundingClientRect();
  drag={x:e.clientX-rect.left,y:e.clientY-rect.top};
  sticker.setPointerCapture(e.pointerId);
});
sticker.addEventListener("pointermove",e=>{
  if(!drag)return;
  const box=document.querySelector(".camera").getBoundingClientRect();
  const x=Math.max(0,Math.min(e.clientX-box.left-drag.x,box.width-sticker.offsetWidth));
  const y=Math.max(0,Math.min(e.clientY-box.top-drag.y,box.height-sticker.offsetHeight));
  sticker.style.left=x+"px";sticker.style.top=y+"px";sticker.style.bottom="auto";sticker.style.transform="none";
});
sticker.addEventListener("pointerup",()=>drag=null);

captureBtn.addEventListener("click",async()=>{
  const camera=document.querySelector(".camera");
  const ratio=window.devicePixelRatio>1?2:1;
  canvas.width=camera.clientWidth*ratio;canvas.height=camera.clientHeight*ratio;
  const ctx=canvas.getContext("2d");
  const vw=video.videoWidth,vh=video.videoHeight,cw=canvas.width,ch=canvas.height;
  const scale=Math.max(cw/vw,ch/vh),sw=cw/scale,sh=ch/scale;
  ctx.save();
  if(facing==="user"){ctx.translate(cw,0);ctx.scale(-1,1)}
  ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,cw,ch);
  ctx.restore();
  const box=camera.getBoundingClientRect(),s=sticker.getBoundingClientRect();
  await drawSticker(ctx,(s.left-box.left)*ratio,(s.top-box.top)*ratio,s.width*ratio,s.height*ratio);
  canvas.toBlob(blob=>{
    photoBlob=blob;
    const url=URL.createObjectURL(blob);
    photo.src=url;download.href=url;
    shareBtn.hidden=!navigator.share;
    dialog.showModal();
  },"image/jpeg",.92);
});

async function drawSticker(ctx,x,y,w,h){
  const clone=sticker.cloneNode(true);
  clone.style.cssText=`position:absolute;left:0;top:0;transform:none;width:${sticker.offsetWidth}px;height:${sticker.offsetHeight}px`;
  const wrapper=document.createElement("div");
  wrapper.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
  wrapper.append(clone);
  const css=await fetch("style.css").then(r=>r.text());
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${sticker.offsetWidth}" height="${sticker.offsetHeight}"><foreignObject width="100%" height="100%"><style>${css}</style>${wrapper.outerHTML}</foreignObject></svg>`;
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)});
  ctx.drawImage(img,x,y,w,h);
}

shareBtn.addEventListener("click",async()=>{
  const file=new File([photoBlob],"iwashin-ar-photo.jpg",{type:"image/jpeg"});
  try{
    if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:"イワシん AR CAMERA"});
    else await navigator.share({title:"イワシん AR CAMERA",url:location.href});
  }catch(e){if(e.name!=="AbortError")message.textContent="共有できませんでした。端末に保存してお使いください"}
});
document.querySelector("#close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
window.addEventListener("pagehide",()=>stream?.getTracks().forEach(track=>track.stop()));
