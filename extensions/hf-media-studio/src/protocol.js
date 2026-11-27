function parseEvent(block) {
 const lines=block.split(/\r?\n/); const event=lines.find(l=>l.startsWith('event:'))?.slice(6).trim();
 const raw=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');
 let data;try{data=JSON.parse(raw);}catch{data=raw;}return {event,data};
}
function fileURL(value,origin){
 if(!value||typeof value!=='object'||typeof value.url!=='string')throw Error('Space did not return a downloadable file.');
 const u=new URL(value.url,origin);if(u.origin!==new URL(origin).origin||u.protocol!=='https:'||u.username||u.password)throw Error('Unexpected output host; refusing to forward credentials.');return u.href;
}
function mediaType(b){
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(b[0]===255&&b[1]===216&&b[2]===255)return 'jpg';
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE')return 'wav';
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'webp';
 if(b.toString('ascii',0,3)==='ID3'||(b[0]===255&&(b[1]&224)===224))return 'mp3';return '';
}
function imageArgs(model,prompt,size,seed){
 if(!prompt.trim()||prompt.length>4000)throw Error('Enter a prompt of 1–4,000 characters.');
 if(!['512x512','768x768','1024x1024','576x1024','1024x576'].includes(size))throw Error('Invalid size.');
 const [w,h]=size.split('x').map(Number),random=!seed.trim(),n=random?0:Number(seed);
 if(!Number.isInteger(n)||n<0||n>2147483647)throw Error('Seed must be an integer from 0 to 2147483647.');
 if(model==='flux')return [prompt,n,random,w,h,4];if(model==='zimage')return [prompt,h,w,9,n,random];throw Error('Unknown image model.');
}
function audioArgs(model,prompt,duration){
 if(!['small-music','small-sfx','medium'].includes(model)||!prompt.trim()||prompt.length>2000||![5,10,15,30].includes(duration))throw Error('Invalid audio settings.');
 return [model,prompt,duration,8,1,'pingpong',0];
}
function redact(s){return String(s).replace(/hf_[\w-]+/g,'[redacted]');}
function spaceError(data){
 if(data==null||data==='')return 'The Space reported failure without an error message. Check remaining ZeroGPU quota and test the Space in your browser. No automatic retry.';
 const raw=typeof data==='string'?data:JSON.stringify(data);
 const detail=redact(raw).slice(0,240);
 if(/quota|rate.limit|too many requests/i.test(detail))return 'Quota or rate limit reported by Space: '+detail;
 return 'Space reported an error: '+detail;
}
function publicImageURL(s){const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hostname.endsWith('.local')||u.hostname.endsWith('.localhost')||u.hostname.endsWith('.internal'))throw Error('Use a public HTTPS image URL without credentials.');return u.href;}
module.exports={parseEvent,fileURL,mediaType,imageArgs,audioArgs,redact,publicImageURL,spaceError};
