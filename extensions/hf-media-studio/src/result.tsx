import {Action,ActionPanel,Detail,Icon} from '@raycast/api';
import {basename} from 'node:path';
import {resultQuota} from './client';
import {pathToFileURL} from 'node:url';
export function Result({path}:{path:string}){const image=/\.(png|jpg|webp)$/.test(path);return <Detail markdown={`# ${basename(path)}\n\n**${resultQuota(path)}**\n\n${image?`![Generated image](${pathToFileURL(path).href})`:'Audio saved. Use Open File to play it.'}`} actions={<ActionPanel><Action.Open title="Open File" target={path}/><Action.ShowInFinder path={path}/><Action.CopyToClipboard title="Copy File" content={{file:path}}/><Action.CopyToClipboard title="Copy File Path" content={path}/><Action.Open title="Open Hugging Face" target="https://huggingface.co/spaces" icon={Icon.Globe}/></ActionPanel>}/>;}
