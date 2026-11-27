import {getPreferenceValues,showToast,Toast} from '@raycast/api';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseEvent,fileURL,mediaType,redact,publicImageURL,spaceError} from './protocol';
import {spaces} from './models';
export {spaces};
const allowed=new Set<string>(Object.values(spaces));
const MAX_IMAGE=20*1024*1024,MAX_OUTPUT=100*1024*1024;
export function folder(){return getPreferenceValues<{output?:string}>().output||join(homedir(),'Downloads','HF Media Studio');}
let activeHeaders: Record<string,string> | undefined;
function profileHeaders(): Record<string,string> {
 const token=getPreferenceValues<{token:string}>().token?.trim();
 if(!token||!/^hf_[\w-]+$/.test(token))throw Error('Enter a valid Hugging Face token in extension preferences.');
 return {Authorization:`Bearer ${token}`};
}
function headers(){return activeHeaders??profileHeaders();}
class SpaceHttpError extends Error {
 constructor(public status:number,message:string){super(message);}
}
export class SpaceUnavailable extends Error {}
async function bounded(r:Response,max:number){
 const len=Number(r.headers.get('content-length'));if(len>max){await r.body?.cancel();throw Error('File exceeds size limit.');}
 const reader=r.body?.getReader();if(!reader)throw Error('Empty response.');const chunks:Buffer[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max)throw Error('File exceeds size limit.');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}return Buffer.concat(chunks,total);
}
async function request(url:string,init:RequestInit={}){
 if(!allowed.has(new URL(url).origin))throw Error('Unapproved Space origin.');
 const r=await fetch(url,{...init,headers:{...headers(),...init.headers},redirect:'error',signal:init.signal||AbortSignal.timeout(600000)});
 if(!r.ok){let msg='';try{msg=redact((await bounded(r,16384)).toString()).slice(0,300);}catch{/* bounded error body */}
 const hint=r.status===429?'Rate limit or GPU quota reached. Wait for reset; no automatic retry.':r.status===401||r.status===403?'Check your token and Space permissions.':r.status===503?'Space may be sleeping or unavailable. Open the Space and try later.':`HTTP ${r.status}.`;throw new SpaceHttpError(r.status,`${hint} ${msg}`);}return r;
}
export async function upload(origin:string,path:string,url?:string){
 let bytes:Buffer;let name:string;
 if(url){const r=await fetch(publicImageURL(url),{redirect:'error',signal:AbortSignal.timeout(30000),credentials:'omit'});if(!r.ok)throw Error(`Image URL HTTP ${r.status}.`);bytes=await bounded(r,MAX_IMAGE);name='remote-image';}
 else {const info=await stat(path);if(!info.isFile()||info.size>MAX_IMAGE)throw Error('Choose an image under 20 MB.');bytes=await readFile(path);name=basename(path);}
 const ext=mediaType(bytes);if(!['png','jpg','webp'].includes(ext)||bytes.length>MAX_IMAGE)throw Error('Choose PNG, JPEG or WebP under 20 MB.');
 const types:Record<string,string>={png:'image/png',jpg:'image/jpeg',webp:'image/webp'};const form=new FormData();form.append('files',new Blob([new Uint8Array(bytes)],{type:types[ext]}),`upload.${ext}`);
 const result=JSON.parse((await bounded(await request(`${origin}/gradio_api/upload`,{method:'POST',body:form}),1024*1024)).toString()) as string[];
 if(!Array.isArray(result)||typeof result[0]!=='string')throw Error('Upload did not return a file path.');return {path:result[0],orig_name:name,meta:{_type:'gradio.FileData'}};
}
export async function run(origin:string,endpoint:string,data:unknown[],toast:Toast){
 if(!/^[a-zA-Z0-9_]+$/.test(endpoint))throw Error('Invalid endpoint.');
 // Read-only preflight; avoids spending quota on known incompatible schemas.
 toast.message='Checking Space API…';
 let info:{named_endpoints?:Record<string,{parameters?:unknown[]}>};
 try {info=JSON.parse((await bounded(await request(`${origin}/gradio_api/info`),4*1024*1024)).toString());}
 catch(e){if(e instanceof SpaceHttpError&&[404,502,503,504].includes(e.status))throw new SpaceUnavailable('Space unavailable before job submission.');throw e;}
 const schema=info.named_endpoints?.[`/${endpoint}`];if(!schema||!Array.isArray(schema.parameters)||schema.parameters.length!==data.length)throw new SpaceUnavailable(`Space API changed or is disabled: /${endpoint}.`);
 const base=`${origin}/gradio_api/call/${endpoint}`;
 const response=JSON.parse((await bounded(await request(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})}),1024*1024)).toString()) as {event_id?:string};
 if(!response.event_id)throw Error('Space did not return a job ID.');toast.message='Queued or generating on Hugging Face';
 const stream=await request(`${base}/${encodeURIComponent(response.event_id)}`);const reader=stream.body?.getReader();if(!reader)throw Error('No event stream received.');const decoder=new TextDecoder();let buf='';
 try{while(true){const {done,value}=await reader.read();buf+=decoder.decode(value,{stream:!done});if(buf.length>4*1024*1024)throw Error('Oversized event stream.');const blocks=buf.split(/\r?\n\r?\n/);buf=blocks.pop()||'';if(done&&buf)blocks.push(buf);
 for(const block of blocks){const e=parseEvent(block);if(e.event==='error')throw Error(spaceError(e.data));if(e.event==='complete'){toast.message='Downloading result…';return e.data};if(e.event==='generating')toast.message='Generating media…';}if(done)break;}}finally{await reader.cancel().catch(()=>{});}throw Error('Connection closed before completion. No automatic retry was made.');
}
export async function save(origin:string,data:unknown,kind:'image'|'audio'|'background'){
 if(!Array.isArray(data))throw Error('Unexpected Space result.');const r=await request(fileURL(data[0],origin));const b=await bounded(r,MAX_OUTPUT);const ext=mediaType(b);
 if(!ext||(kind==='background'&&ext!=='png')||(kind==='audio'&&!['wav','mp3'].includes(ext))||(kind==='image'&&!['png','jpg','webp'].includes(ext)))throw Error('Space returned unexpected media format.');
 const dir=folder();await mkdir(dir,{recursive:true,mode:0o700});const path=join(dir,`${kind}-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}.${ext}`);await writeFile(path,b,{flag:'wx',mode:0o600});return path;
}
async function quotaMessage(): Promise<string> {
  try {
    if(!headers().Authorization)return "Guest quota not reported";
    const r = await fetch('https://huggingface.co/api/spaces/zero-gpu/quota', {
      headers: headers(), redirect: 'error', signal: AbortSignal.timeout(5000)
    });
    if (r.status === 401 || r.status === 403) return 'Quota unavailable: check Billing read permission';
    if (!r.ok) return 'Quota unavailable (HTTP '+r.status+')';
    const q = JSON.parse((await bounded(r,16384)).toString());
    if (typeof q.current !== 'number' || !Number.isFinite(q.current)) return 'Quota unavailable';
    const seconds = Math.max(0, Math.floor(q.current));
    return `ZeroGPU left: ${Math.floor(seconds/60)}m ${seconds%60}s`;
  } catch { return 'Quota unavailable'; }
}
let lastQuota: { path: string; message: string } | undefined;
export function resultQuota(path: string): string {
  return lastQuota?.path === path ? lastQuota.message : 'Quota not recorded';
}
let active=false;
export async function execute(task:(toast:Toast)=>Promise<string>){if(active){await showToast({style:Toast.Style.Failure,title:'A generation is already active'});return;}active=true;try{const toast=await showToast({style:Toast.Style.Animated,title:'Submitting to Hugging Face'});try{activeHeaders=profileHeaders();const path=await task(toast);toast.style=Toast.Style.Success;toast.title='Saved media';const message=await quotaMessage();lastQuota={path,message};toast.message=message;return path;}catch(e){toast.style=Toast.Style.Failure;toast.title='Generation failed';toast.message=redact(e).slice(0,300)+" · "+await quotaMessage();return undefined;}}finally{activeHeaders=undefined;active=false;}}


// HF AI Toolbox: dynamic public Space adapters.
export type ToolParam = {
 parameter_name?:string;
 label?:string;
 component?:string;
 parameter_has_default?:boolean;
 parameter_default?:unknown;
 type?:{
  type?:string;
  enum?:unknown[];
  properties?:Record<string,unknown>;
  title?:string
 };
};

export type ToolEndpoint={
 name:string;
 parameters:ToolParam[]
};

class ToolboxNoRetry extends Error {}

export async function toolboxInspect(repo:string){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo))
  throw Error('Invalid Space ID');

 const meta=await fetch(
  'https://huggingface.co/api/spaces/'+repo,{
   redirect:'error',
   signal:AbortSignal.timeout(15000)
  });

 if(!meta.ok)
  throw Error(`Hub HTTP ${meta.status}: Space unavailable`);

 const d=JSON.parse(
  (await bounded(meta,1024*1024)).toString());

 if(d.private!==false||d.sdk!=='gradio')
  throw Error('Only public Gradio Spaces are supported.');

 const u=new URL(d.host||('https://'+d.subdomain+'.hf.space'));

 if(u.protocol!=='https:'||
    !/^[a-z0-9-]+\.hf\.space$/.test(u.hostname)||
    u.port||u.username||u.password||
    u.pathname!=='/'||u.search||u.hash)
  throw Error('Invalid Space host');

 const origin=u.origin;

 const r=await fetch(origin+'/gradio_api/info',{
  redirect:'error',
  signal:AbortSignal.timeout(20000)
 });

 if(!r.ok)
  throw Error(`Space API HTTP ${r.status}; open original Space.`);

 const info=JSON.parse(
  (await bounded(r,4*1024*1024)).toString());

 const endpoints:ToolEndpoint[]=[];

 for(const [name,raw] of Object.entries(info.named_endpoints||{})){
  const e=raw as {
   parameters?:ToolParam[];
   returns?:unknown[]
  };

  if(/^\/[a-zA-Z0-9_]+$/.test(name)&&
     Array.isArray(e.parameters)&&
     e.parameters.length<=40&&
     Array.isArray(e.returns)&&e.returns.length>0)
   endpoints.push({name,parameters:e.parameters});
 }

 if(!endpoints.length)
  throw Error('No compatible named Gradio endpoints exposed.');

 allowed.add(origin);

 const hardware=String(
  d.runtime?.hardware?.current||
  d.runtime?.hardware?.requested||'unknown'
 );

 return {origin,endpoints,hardware};
}

export async function toolboxUpload(origin:string,path:string){
 const types:Record<string,string>={
  png:'image/png',
  jpg:'image/jpeg',
  jpeg:'image/jpeg',
  webp:'image/webp',
  wav:'audio/wav',
  mp3:'audio/mpeg',
  flac:'audio/flac',
  m4a:'audio/mp4',
  ogg:'audio/ogg',
  mp4:'video/mp4',
  mov:'video/quicktime',
  webm:'video/webm',
  pdf:'application/pdf'
 };

 const ext=path.split('.').pop()?.toLowerCase()||'';
 const f=await stat(path);

 if(!types[ext]||!f.isFile()||f.size>50*1024*1024)
  throw Error('Select supported media under 50 MB.');

 const bytes=await readFile(path);
 if(bytes.length>50*1024*1024)
  throw Error('File exceeds 50 MB.');

 const form=new FormData();

 form.append(
  'files',
  new Blob([new Uint8Array(bytes)],{type:types[ext]}),
  'upload.'+ext
 );

 const res=JSON.parse((await bounded(
  await request(origin+'/gradio_api/upload',{
   method:'POST',body:form
  }),1024*1024)).toString());

 if(!Array.isArray(res)||typeof res[0]!=='string')
  throw Error('Invalid file upload response');

 return {
  path:res[0],
  orig_name:basename(path),
  meta:{_type:'gradio.FileData'}
 };
}

export async function toolboxGenerate(
 origin:string,
 hardware:string,
 endpoint:string,
 data:unknown[],
 toast:Toast
){
 try{
  const auth=(headers() as Record<string,string>).Authorization;

  if(auth&&hardware.toLowerCase().startsWith('zero')){
   const r=await fetch(
    'https://huggingface.co/api/spaces/zero-gpu/quota',{
     headers:{Authorization:auth},
     redirect:'error',
     signal:AbortSignal.timeout(5000)
    });

   if(!r.ok)
    throw Error('Quota check failed; check Billing read permission.');

   const q=JSON.parse(
    (await bounded(r,16384)).toString());

   if(typeof q.current!=='number'||!Number.isFinite(q.current))
    throw Error('Quota response unavailable.');

   if(q.current<=0)
    throw Error('ZeroGPU quota exhausted. Wait for reset or use CPU.');
  }

  return await run(
   origin,endpoint.replace(/^\//,''),data,toast
  );

 }catch(e){
  throw new ToolboxNoRetry(redact(e));
 }
}

export async function toolboxSave(origin:string,data:unknown){
 const files:Record<string,unknown>[]=[];
 const strings:string[]=[];

 function visit(v:unknown,depth=0){
  if(depth>20)return;

  if(typeof v==='string'){
   strings.push(v);
   return;
  }

  if(Array.isArray(v)){
   for(const x of v)visit(x,depth+1);
   return;
  }

  if(v&&typeof v==='object'){
   const o=v as Record<string,unknown>;

   if(typeof o.url==='string'&&typeof o.path==='string'){
    files.push(o);
    return;
   }

   for(const x of Object.values(o))visit(x,depth+1);
  }
 }

 visit(data);

 const dir=folder();
 await mkdir(dir,{recursive:true,mode:0o700});

 const paths:string[]=[];
 let total=0;
 let skipped=0;

 async function persist(bytes:Buffer,ext:string){
  const path=join(
   dir,'toolbox-'+Date.now()+'-'+
   randomUUID().slice(0,8)+'.'+ext
  );

  await writeFile(path,bytes,{flag:'wx',mode:0o600});
  paths.push(path);
 }

 for(const obj of files.slice(0,8)){
  try{
   const url=fileURL(obj,origin);
   const pathname=new URL(url).pathname;

   if(!/\/(?:gradio_api\/)?file[=/]/.test(pathname))
    throw Error('Unexpected file path');

   const r=await request(url);
   const b=await bounded(
    r,Math.min(MAX_OUTPUT,150*1024*1024-total)
   );

   total+=b.length;

   const mime=(r.headers.get('content-type')||'').split(';')[0];

   const hint=String(obj.orig_name||obj.path||'')
    .split('.').pop()?.toLowerCase()||'';

   let ext:string=mediaType(b);

   if(!ext&&b.toString('ascii',4,8)==='ftyp')
    ext=hint==='m4a'?'m4a':hint==='mov'?'mov':'mp4';

   if(!ext&&b.toString('ascii',0,4)==='fLaC')
    ext='flac';

   if(!ext&&b.toString('ascii',0,4)==='OggS')
    ext='ogg';

   if(!ext&&b.toString('ascii',0,4)==='glTF')
    ext='glb';

   if(!ext&&hint==='npz'&&b[0]===80&&b[1]===75)
    ext='npz';

   if(!ext&&['obj','stl'].includes(hint)&&!mime.includes('html'))
    ext=hint;

   if(!ext&&hint==='txt'&&mime.startsWith('text/plain'))
    ext='txt';

   if(!ext)throw Error('Unsupported output format');

   await persist(b,ext);

  }catch{
   skipped++;
  }
 }

 if(strings.length){
  const text=redact(strings.join('\n\n')).slice(0,1000000);
  if(text.trim())await persist(Buffer.from(text),'txt');
 }

 if(!paths.length)
  throw Error('No supported output could be saved.');

 if(skipped||files.length>8)
  await persist(
   Buffer.from(`Some outputs were skipped (${skipped+Math.max(0,files.length-8)}).`),
   'txt'
  );

 return paths;
}
