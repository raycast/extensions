"use strict";var O=Object.defineProperty;var F=Object.getOwnPropertyDescriptor;var I=Object.getOwnPropertyNames;var D=Object.prototype.hasOwnProperty;var J=(n,r)=>{for(var e in r)O(n,e,{get:r[e],enumerable:!0})},U=(n,r,e,c)=>{if(r&&typeof r=="object"||typeof r=="function")for(let i of I(r))!D.call(n,i)&&i!==e&&O(n,i,{get:()=>r[i],enumerable:!(c=F(r,i))||c.enumerable});return n};var V=n=>U(O({},"__esModule",{value:!0}),n);var H={};J(H,{default:()=>N});module.exports=V(H);var t=require("@raycast/api"),m=require("react");var k="http://127.0.0.1:3100";async function A(){try{let n=await fetch(`${k}/health`,{signal:AbortSignal.timeout(3e3)});if(!n.ok)throw new Error("Bridge not responding");let r=await n.json(),e=Object.entries(r.servers).map(([s,l])=>({name:s,config:{command:""},tools:[],process:null,connected:l==="connected",id:0})),i=await(await fetch(`${k}/tools`,{signal:AbortSignal.timeout(3e3)})).json(),h=i.tools||i;for(let s of h){let l=s.server||(s.name?.includes("__")?s.name.split("__")[0]:"unknown"),g=e.find(d=>d.name===l);g&&g.tools.push({name:s.name,description:s.description})}let u=e.reduce((s,l)=>s+l.tools.length,0);return{running:!0,servers:e,toolCount:u}}catch{return{running:!1,servers:[],toolCount:0}}}async function x(){try{let n=await fetch(`${k}/tools/openai`,{signal:AbortSignal.timeout(5e3)});return n.ok?(await n.json()).map(e=>({type:"function",function:{name:e.function.name,description:e.function.description,parameters:e.function.parameters||{type:"object",properties:{}}}})):[]}catch{return[]}}async function j(n,r){try{let e=await fetch(`${k}/call`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n,arguments:r}),signal:AbortSignal.timeout(6e4)});return e.ok?await e.text():JSON.stringify({error:`Bridge error: ${e.status}`})}catch(e){return JSON.stringify({error:e.message})}}async function B(n){let r=await fetch(`${n}/api/tags`);if(!r.ok)throw new Error(`Failed to fetch models: ${r.status}`);return(await r.json()).models||[]}async function E(n,r,e,c,i,h){let u={model:r,messages:e,stream:!0};c.length>0&&(u.tools=c);let s=await fetch(`${n}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(u),signal:h});if(!s.ok){let f=await s.text();throw new Error(`Ollama error ${s.status}: ${f}`)}let l=s.body?.getReader();if(!l)throw new Error("No response body");let g=new TextDecoder,d="",w=[];for(;;){let{done:f,value:y}=await l.read();if(f)break;d+=g.decode(y,{stream:!0});let v=d.split(`
`);d=v.pop()||"";for(let S of v)if(S.trim())try{let p=JSON.parse(S);if(p.message?.content&&i.onToken(p.message.content),p.message?.tool_calls)for(let o of p.message.tool_calls)w.push(o);p.done&&(w.length>0&&i.onToolCalls(w),i.onDone())}catch{}}}var a=require("react/jsx-runtime");function z(n,r,e,c){let i=c.filter(s=>s.connected),h=i.length>0?`

> **MCP Tools:** ${i.map(s=>`${s.name} (${s.tools.length})`).join(", ")}`:"\n\n> \u26A0\uFE0F MCP Bridge not running. Start with: `node mcp-bridge.js`";return n.length===0&&!r?`# \u{1F999} Ollama + MCP Chat

**Model:** \`${e}\`${h}

Press **\u2318+N** to start chatting. **\u2318+T** to see tools.`:(r?[...n,{role:"assistant",content:r}]:n).map(s=>{if(s.role==="user")return`### \u{1F9D1} You

${s.content}`;if(s.role==="tool"){let l=s.content;try{let g=JSON.parse(s.content);g.content&&(l=g.content.map(d=>d.text||JSON.stringify(d)).join(`
`))}catch{}return`> \u{1F527} **${s.name||"Tool"}**
>
> ${l.split(`
`).join(`
> `)}`}if(s.role==="assistant"){let l=`### \u{1F916} ${e}

${s.content||"*(thinking...)*"}`;return s.tool_calls?.length&&(l+=`

`+s.tool_calls.map(g=>`\u{1F527} Calling \`${g.function.name}\`...`).join(`
`)),l}return""}).join(`

---

`)}function G({onSend:n}){let{pop:r}=(0,t.useNavigation)();return(0,a.jsx)(t.Form,{actions:(0,a.jsx)(t.ActionPanel,{children:(0,a.jsx)(t.Action.SubmitForm,{title:"Send",icon:t.Icon.Message,onSubmit:e=>{e.message.trim()&&(n(e.message.trim()),r())}})}),children:(0,a.jsx)(t.Form.TextField,{id:"message",title:"Message",placeholder:"Ask anything...",autoFocus:!0})})}function L({servers:n}){let r=n.filter(c=>c.connected),e=r.length===0?`# \u{1F527} No MCP Tools

MCP Bridge server is not running.

Start it:
\`\`\`
cd /Users/scotgardner/.cola/outputs/raycast-ollama
node mcp-bridge.js
\`\`\``:r.map(c=>`### ${c.name}

${c.tools.map(i=>`- **${i.name}**`).join(`
`)}`).join(`

---

`);return(0,a.jsx)(t.Detail,{markdown:e})}function R({model:n,servers:r,tools:e}){let[c,i]=(0,m.useState)([]),[h,u]=(0,m.useState)(""),[s,l]=(0,m.useState)(!1),g=(0,m.useRef)(null),d=(0,t.getPreferenceValues)().ollamaUrl||"http://localhost:11434",{push:w}=(0,t.useNavigation)(),f=(0,m.useCallback)(async S=>{l(!0),u("");let p=new AbortController;g.current=p;let o="",M=[];try{await new Promise(($,b)=>{E(d,n,S,e,{onToken:C=>{o+=C,u(o)},onToolCalls:C=>{M=C},onDone:()=>$(),onError:C=>b(C)},p.signal)})}catch($){$.name!=="AbortError"&&(0,t.showToast)(t.Toast.Style.Failure,"Error",$.message),l(!1);return}let P={role:"assistant",content:o,...M.length>0&&{tool_calls:M}},T=[...S,P];if(i(T),u(""),M.length>0){(0,t.showToast)(t.Toast.Style.Animated,"Executing tools...",`${M.length} tool(s)`);let $=[];for(let C of M){(0,t.showToast)(t.Toast.Style.Animated,`\u{1F527} ${C.function.name}`,"Running...");let _=await j(C.function.name,C.function.arguments||{});$.push({role:"tool",content:_,name:C.function.name})}(0,t.showToast)(t.Toast.Style.Success,"Tools done",`${$.length} result(s)`);let b=[...T,...$];i(b),await f(b)}l(!1)},[n,d,e]),y=(0,m.useCallback)(async S=>{let p={role:"user",content:S},o=[...c,p];i(o),await f(o)},[c,f]),v=h||c.filter(S=>S.role==="assistant").pop()?.content||"";return(0,a.jsx)(t.Detail,{isLoading:s&&!h,markdown:z(c,h,n,r),actions:(0,a.jsxs)(t.ActionPanel,{children:[!s&&(0,a.jsx)(t.Action,{title:"New Message",icon:t.Icon.Message,shortcut:{modifiers:["cmd"],key:"n"},onAction:()=>w((0,a.jsx)(G,{onSend:y}))}),s&&(0,a.jsx)(t.Action,{title:"Stop",icon:t.Icon.Stop,onAction:()=>g.current?.abort()}),(0,a.jsx)(t.Action,{title:"View Tools",icon:t.Icon.WrenchScrewdriver,shortcut:{modifiers:["cmd"],key:"t"},onAction:()=>w((0,a.jsx)(L,{servers:r}))}),v&&(0,a.jsx)(t.Action.CopyToClipboard,{title:"Copy Response",content:v,shortcut:{modifiers:["cmd"],key:"c"}}),(0,a.jsx)(t.Action,{title:"Clear Chat",icon:t.Icon.Trash,shortcut:{modifiers:["cmd"],key:"k"},onAction:()=>{i([]),u("")}})]})})}function N(){let[n,r]=(0,m.useState)([]),[e,c]=(0,m.useState)([]),[i,h]=(0,m.useState)([]),[u,s]=(0,m.useState)(!0),[l,g]=(0,m.useState)(null),d=(0,t.getPreferenceValues)(),w=d.ollamaUrl||"http://localhost:11434",f=d.defaultModel||"",{push:y}=(0,t.useNavigation)();if((0,m.useEffect)(()=>{let o=!0;async function M(){try{let T=await B(w);o&&r(T)}catch(T){o&&g(T.message),s(!1);return}let P=await A();if(o&&(c(P.servers),P.running)){let T=await x();o&&h(T)}o&&s(!1)}return M(),()=>{o=!1}},[w]),(0,m.useEffect)(()=>{f&&n.length>0&&!u&&n.some(o=>o.name===f)&&y((0,a.jsx)(R,{model:f,servers:e,tools:i}))},[f,n,u,e,i,y]),l)return(0,a.jsx)(t.Detail,{markdown:`# \u274C Connection Error

Could not connect to Ollama at \`${w}\`

**Error:** ${l}

Make sure Ollama is running:
\`\`\`
ollama serve
\`\`\``});let v=o=>o>1e9?`${(o/1e9).toFixed(1)} GB`:`${(o/1e6).toFixed(0)} MB`,S=e.filter(o=>o.connected).length,p=i.length;return(0,a.jsxs)(t.List,{isLoading:u,searchBarPlaceholder:"Search models...",children:[e.length>0&&(0,a.jsx)(t.List.Section,{title:"MCP Servers",subtitle:`${S} connected, ${p} tools`,children:e.map(o=>(0,a.jsx)(t.List.Item,{title:o.name,subtitle:o.connected?`${o.tools.length} tool${o.tools.length!==1?"s":""}: ${o.tools.map(M=>M.name).slice(0,3).join(", ")}${o.tools.length>3?"...":""}`:"Disconnected",icon:o.connected?"\u2705":"\u274C"},o.name))}),!u&&e.length===0&&(0,a.jsx)(t.List.Section,{title:"MCP Servers",children:(0,a.jsx)(t.List.Item,{title:"Bridge not running",subtitle:"Start: node mcp-bridge.js",icon:"\u26A0\uFE0F"})}),(0,a.jsx)(t.List.Section,{title:"Local Models",subtitle:`${n.length} available`,children:n.map(o=>(0,a.jsx)(t.List.Item,{title:o.name,subtitle:`${v(o.size)}${o.details?.parameter_size?` \xB7 ${o.details.parameter_size}`:""}`,icon:"\u{1F999}",actions:(0,a.jsxs)(t.ActionPanel,{children:[(0,a.jsx)(t.Action,{title:`Chat with ${o.name}`,onAction:()=>y((0,a.jsx)(R,{model:o.name,servers:e,tools:i})),icon:t.Icon.Message}),(0,a.jsx)(t.Action,{title:"View Tools",icon:t.Icon.WrenchScrewdriver,shortcut:{modifiers:["cmd"],key:"t"},onAction:()=>y((0,a.jsx)(L,{servers:e}))})]})},o.name))})]})}
