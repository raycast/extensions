import {
 Action,ActionPanel,Detail,Form,List,Icon,
 showToast,Toast,useNavigation
} from '@raycast/api';

import {useEffect,useState} from 'react';
import {basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import * as C from './client';
import type {ToolParam,ToolEndpoint} from './client';

const catalog:[string,string,string][]=[
 ['Image generation','Z-Image Turbo','mrfakename/Z-Image-Turbo'],
 ['Image generation','FLUX Schnell','black-forest-labs/FLUX.1-schnell'],
 ['Image editing','Qwen Image 2.1 Realtime','linoyts/qwen-image-2-1-realtime'],
 ['Image editing','Qwen Image Edit Fast','prithivMLmods/Qwen-Image-Edit-2511-LoRAs-Fast'],
 ['Background removal','BiRefNet','not-lain/background-removal'],
 ['Image upscaling','Kandinsky ImageSR 2.0','kandinskylab/Kandinsky-ImageSR-2.0-Demo'],
 ['Camera angle control','Qwen Image Edit Angles','linoyts/Qwen-Image-Edit-Angles'],
 ['Image outpainting','SDXL ControlNet Outpaint','fffiloni/diffusers-image-outpaint'],
 ['Text-to-speech','Chatterbox Turbo','ResembleAI/chatterbox-turbo-demo'],
 ['Text-to-speech','Qwen3-TTS','Qwen/Qwen3-TTS'],
 ['Voice cloning','Chatterbox Turbo','ResembleAI/chatterbox-turbo-demo'],
 ['Voice cloning','Qwen3-TTS','Qwen/Qwen3-TTS'],
 ['Audio transcription','Whisper Large V3','hf-audio/whisper-large-v3'],
 ['Audio transcription','Qwen3-ASR','Qwen/Qwen3-ASR'],
 ['Voice isolation','Voice Isolator','mrfakename/voice-isolator'],
 ['Music generation','ACE-Step 1.5','ACE-Step/Ace-Step-v1.5'],
 ['Music generation','Stable Audio 3','stabilityai/stable-audio-3'],
 ['Sound effects','Stable Audio 3','stabilityai/stable-audio-3'],
 ['Video generation','WAN 2.2 Fast','zerogpu-aoti/wan2-2-fp8da-aoti-faster'],
 ['Talking avatar','LongCat 1.6','victor/LongCat-Video-Avatar-1.6'],
 ['Video upscaling','FlashVSR+','hugging-apps/flashvsr-plus'],
 ['Character animation','Viggle Animate','Viggle/viggle-animate'],
 ['3D object generation','TRELLIS.2','microsoft/TRELLIS.2'],
 ['OCR','DeepSeek OCR','akhaliq/DeepSeek-OCR'],
 ['Image captioning','JoyCaption Beta','fancyfeast/joy-caption-beta-one'],
 ['Depth map generation','DepthPro2-L','hugging-apps/depthpro2-l'],
 ['Object segmentation','SAM3','prithivMLmods/SAM3-Demo'],
];

type Model=typeof catalog[number];
type Info=Awaited<ReturnType<typeof C.toolboxInspect>>;

const page=(m:Model)=>
 'https://huggingface.co/spaces/'+m[2];

const component=(p:ToolParam)=>
 (p.component||'').toLowerCase();

const isFile=(p:ToolParam)=>
 ['image','audio','video','file','gallery','imageeditor']
 .includes(component(p));

const isBool=(p:ToolParam)=>
 p.type?.type==='boolean'||component(p)==='checkbox';

const choices=(p:ToolParam)=>
 p.type?.enum?.filter(
  x=>['string','number','boolean'].includes(typeof x)
 )||[];

const isText=(p:ToolParam)=>
 p.type?.type==='string'||
 ['textbox','textarea'].includes(component(p));

const def=(p:ToolParam)=>p.parameter_default;

function defaultText(p:ToolParam){
 const d=def(p);
 return d==null?'':typeof d==='string'?d:JSON.stringify(d);
}

function field(p:ToolParam,i:number){
 const id='p'+i;
 const title=p.label||p.parameter_name||id;

 if(isFile(p))
  return <Form.FilePicker key={id} id={id} title={title}
   allowMultipleSelection={false} canChooseDirectories={false}/>;

 if(isBool(p))
  return <Form.Checkbox key={id} id={id} label={title}
   defaultValue={def(p)===true}/>;

 const opts=choices(p);

 if(opts.length)
  return <Form.Dropdown key={id} id={id} title={title}
   defaultValue={String(Math.max(0,opts.indexOf(def(p))))}>
   {opts.map((x,j)=>
    <Form.Dropdown.Item key={j} value={String(j)} title={String(x)}/>
   )}
  </Form.Dropdown>;

 if(isText(p))
  return <Form.TextArea key={id} id={id} title={title}
   defaultValue={defaultText(p)}/>;

 return <Form.TextField key={id} id={id}
  title={title+' (JSON / number)'} defaultValue={defaultText(p)}/>;
}

async function value(p:ToolParam,v:unknown,origin:string){
 if(isFile(p)){
  if(!Array.isArray(v)||!v.length){
   if(p.parameter_has_default)return def(p)??null;
   throw Error('Select '+(p.label||p.parameter_name||'a file'));
  }

  const f=await C.toolboxUpload(origin,String(v[0]));

  if(component(p)==='video'&&
     (p.type?.properties?.video||p.type?.title==='VideoData'))
   return {video:f,subtitles:null};

  if(component(p)==='gallery')
   return [{image:f,caption:null}];

  if(component(p)==='imageeditor')
   return {background:f,layers:[],composite:f};

  if(p.type?.type==='array')return [f];

  return f;
 }

 if(isBool(p))return Boolean(v);

 const opts=choices(p);
 if(opts.length)return opts[Number(v)];

 const str=String(v??'');

 if(isText(p))return str;

 if(!str.trim()&&p.parameter_has_default)
  return def(p)??null;

 try{return JSON.parse(str);}
 catch{
  throw Error('Invalid JSON or number for '+(p.label||p.parameter_name||'parameter'));
 }
}

function message(e:unknown){
 return String(e).replace(/hf_[\w-]+/g,'[redacted]').slice(0,500);
}

function Output({paths}:{paths:string[]}){
 const path=paths[0];
 const [text,setText]=useState('');

 useEffect(()=>{
  if(path.endsWith('.txt'))
   readFile(path,'utf8').then(setText).catch(()=>{});
 },[path]);

 const quota=(C as unknown as {
  resultQuota?:(p:string)=>string
 }).resultQuota?.(path)||'See generation notification for quota.';

 const image=/\.(png|jpg|webp)$/.test(path);

 const body=image?
  '![Generated image]('+pathToFileURL(path).href+')':
  text?'```\n'+text.slice(0,50000).replace(/```/g,'`\u200b``')+'\n```':
  'Media saved. Open File to preview.';

 return <Detail
  markdown={'# Generation completed\n\n**'+quota+'**\n\n'+
   basename(path)+'\n\n'+body+'\n\n'+paths.length+' saved file(s).'}
  actions={<ActionPanel>
   <Action.Open title="Open File" target={path}/>
   <Action.ShowInFinder path={path}/>
   <Action.CopyToClipboard title="Copy File" content={{file:path}}/>
   {text&&<Action.CopyToClipboard title="Copy Text" content={text}/>}
   <Action.CopyToClipboard title="Copy File Path" content={path}/>
   {paths.slice(1).map(p=>
    <Action.Open key={p} title={'Open '+basename(p)} target={p}/>
   )}
  </ActionPanel>}
 />;
}

function Generate({model,info,endpoint}:{
 model:Model;
 info:Info;
 endpoint:ToolEndpoint
}){
 const {push}=useNavigation();
 const [busy,setBusy]=useState(false);

 async function submit(v:Record<string,unknown>){
  if(busy)return;

  if(!v.consent){
   await showToast({
    style:Toast.Style.Failure,
    title:'Confirm public Space processing first'
   });
   return;
  }

  setBusy(true);
  let paths:string[]=[];

  try{
   const path=await C.execute(async toast=>{
    const args:unknown[]=[];

    for(let i=0;i<endpoint.parameters.length;i++)
     args.push(await value(
      endpoint.parameters[i],v['p'+i],info.origin
     ));

    const data=await C.toolboxGenerate(
     info.origin,info.hardware,endpoint.name,args,toast
    );

    try{
     paths=await C.toolboxSave(info.origin,data);
    }catch(e){
     throw Error('Output saving failed. No job retry: '+message(e));
    }

    return paths[0];
   });

   if(path&&paths.length)push(<Output paths={paths}/>);

  }catch(e){
   await showToast({
    style:Toast.Style.Failure,
    title:'Generation failed',
    message:message(e)
   });
  }finally{
   setBusy(false);
  }
 }

 return <Form isLoading={busy}
  actions={<ActionPanel>
   {!busy&&<Action.SubmitForm title="Run Space" onSubmit={submit}/>}
   <Action.OpenInBrowser title="Open Original Space" url={page(model)}/>
  </ActionPanel>}>

  <Form.Description text={model[1]+' · '+endpoint.name+' · '+info.hardware+
   ' · Use only non-confidential media and authorized voices/images. Large jobs may exceed quota. Some advanced inputs may require the browser.'}/>

  {endpoint.parameters.map(field)}

  <Form.Checkbox id="consent"
   label="I agree to send these inputs to this public Space and have permission to use them."
   defaultValue={false}/>

 </Form>;
}

function Endpoints({model}:{model:Model}){
 const [info,setInfo]=useState<Info>();
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const {push}=useNavigation();

 async function refresh(){
  setLoading(true);
  setError('');

  try{setInfo(await C.toolboxInspect(model[2]));}
  catch(e){
   setInfo(undefined);
   setError(message(e));
  }finally{setLoading(false);}
 }

 useEffect(()=>{void refresh();},[]);

 if(error)
  return <Detail markdown={'# Space unavailable\n\n'+error}
   actions={<ActionPanel>
    <Action title="Refresh API" onAction={refresh}/>
    <Action.OpenInBrowser title="Open Original Space" url={page(model)}/>
   </ActionPanel>}/>;

 return <List isLoading={loading}
  searchBarPlaceholder="Choose a generation endpoint">

  {info&&info.endpoints.map(e=>
   <List.Item key={e.name} title={e.name}
    subtitle={e.parameters.map(p=>p.parameter_name||p.label).join(', ').slice(0,120)}
    actions={<ActionPanel>
     <Action title="Configure Endpoint"
      onAction={()=>push(<Generate model={model} info={info} endpoint={e}/>)}/>
     <Action.OpenInBrowser title="Open Original Space" url={page(model)}/>
    </ActionPanel>}/>
  )}

 </List>;
}

export default function Command(){
 const {push}=useNavigation();

 return <List searchBarPlaceholder="Search 21 AI tasks and models">
  {catalog.map((m,i)=>
   <List.Item key={i} title={m[0]} subtitle={m[1]} icon={Icon.Image}
    actions={<ActionPanel>
     <Action title="Inspect Live API"
      onAction={()=>push(<Endpoints model={m}/>)} />
     <Action.OpenInBrowser title="Open Original Space" url={page(m)}/>
    </ActionPanel>}/>
  )}
 </List>;
}
