import {Action,ActionPanel,Form,useNavigation} from '@raycast/api';
import {useState} from 'react';
import {execute,run,save,spaces,SpaceUnavailable} from './client';
import {imageSizes} from './models';
import {imageArgs} from './protocol';
import {Result} from './result';
export default function Command(){const {push}=useNavigation();const [busy,setBusy]=useState(false);async function submit(v:{model:'flux'|'zimage';prompt:string;ratio:string;seed:string;fallback:boolean}){if(busy)return;setBusy(true);try{const path=await execute(async t=>{const generate=async (model:'flux'|'zimage')=>{
 const args=imageArgs(model,v.prompt,v.ratio,v.seed||'');
 const origin=spaces[model];
 return save(origin,await run(origin,model==='flux'?'infer':'generate_image',args,t),'image');
};
try{return await generate(v.model);}
catch(e){
 if(!v.fallback||!(e instanceof SpaceUnavailable))throw e;
 const other=v.model==='flux'?'zimage':'flux';
 t.message=`Trying ${other==='flux'?'FLUX':'Z-Image'} instead…`;
 return generate(other);
}});if(path)push(<Result path={path}/>);}finally{setBusy(false);}}return <Form isLoading={busy} actions={<ActionPanel>{!busy&&<><Action.SubmitForm title="Generate Image" onSubmit={submit}/><Action.OpenInBrowser title="Open FLUX Space" url="https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell"/><Action.OpenInBrowser title="Open Z-Image Space" url="https://huggingface.co/spaces/mrfakename/Z-Image-Turbo"/></>}</ActionPanel>}><Form.Description text="Public Spaces · shared ZeroGPU quota · no paid provider calls"/><Form.Dropdown id="model" title="Model" defaultValue="zimage"><Form.Dropdown.Item value="flux" title="FLUX.1 Schnell (4 steps)"/><Form.Dropdown.Item value="zimage" title="Z-Image Turbo (9 steps)"/></Form.Dropdown><Form.Checkbox id="fallback" label="Try alternate image model if unavailable before submission" defaultValue={true}/><Form.TextArea id="prompt" title="Prompt"/><Form.Dropdown id="ratio" title="Size" defaultValue="1024x1024">{imageSizes.map(v=><Form.Dropdown.Item key={v} value={v} title={v}/>)}</Form.Dropdown><Form.TextField id="seed" title="Seed (optional)" placeholder="Random"/></Form>;}
