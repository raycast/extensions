import {Action,ActionPanel,List,Icon} from '@raycast/api';
import {useEffect,useState} from 'react';
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {folder} from './client';
export default function Command(){const [files,setFiles]=useState<string[]>([]);const [busy,setBusy]=useState(true);useEffect(()=>{readdir(folder()).then(f=>setFiles(f.filter(n=>/^(image|audio|background|toolbox)-.*\.(png|jpg|webp|wav|mp3|mp4|mov|m4a|flac|ogg|glb|obj|stl|npz|txt|json)$/.test(n)).sort().reverse())).catch(()=>{}).finally(()=>setBusy(false));},[]);return <List isLoading={busy} searchBarPlaceholder="Search generated media">{files.map(n=><List.Item key={n} title={n} icon={/\.(png|jpg|webp)$/.test(n)?{source:join(folder(),n)}:Icon.Music} quickLook={{path:join(folder(),n)}} actions={<ActionPanel><Action.Open title="Open File" target={join(folder(),n)}/><Action.ToggleQuickLook/><Action.CopyToClipboard title="Copy File" content={{file:join(folder(),n)}}/><Action.ShowInFinder path={join(folder(),n)}/><Action.CopyToClipboard title="Copy Path" content={join(folder(),n)}/></ActionPanel>}/>)}</List>;}
