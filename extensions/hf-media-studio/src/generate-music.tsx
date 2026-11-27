import {Action,ActionPanel,Form,useNavigation} from '@raycast/api';
import {useState} from 'react';
import {execute,run,save,spaces} from './client';
import {audioModels} from './models';
import {audioArgs} from './protocol';
import {Result} from './result';
export default function Command(){const {push}=useNavigation();const [busy,setBusy]=useState(false);async function submit(v:{model:string;prompt:string;duration:string}){if(busy)return;setBusy(true);try{const path=await execute(async t=>save(spaces.audio,await run(spaces.audio,'infer',audioArgs(v.model,v.prompt,Number(v.duration)),t),'audio'));if(path)push(<Result path={path}/>);}finally{setBusy(false);}}return <Form isLoading={busy} actions={<ActionPanel>{!busy&&<Action.SubmitForm title="Generate Audio" onSubmit={submit}/>}</ActionPanel>}><Form.Description text="Stable Audio 3 · ZeroGPU · short music and effects · check model license before commercial use."/><Form.Dropdown id="model" title="Model" defaultValue="small-music">{audioModels.map(v=><Form.Dropdown.Item key={v.value} value={v.value} title={v.title}/>)}</Form.Dropdown><Form.TextArea id="prompt" title="Describe Audio"/><Form.Dropdown id="duration" title="Duration" defaultValue="5">{['5','10','15','30'].map(v=><Form.Dropdown.Item key={v} value={v} title={`${v} seconds`}/>)}</Form.Dropdown></Form>;}
