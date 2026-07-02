"use strict";var O=Object.defineProperty;var _=Object.getOwnPropertyDescriptor;var D=Object.getOwnPropertyNames;var I=Object.prototype.hasOwnProperty;var J=(n,r)=>{for(var o in r)O(n,o,{get:r[o],enumerable:!0})},V=(n,r,o,l)=>{if(r&&typeof r=="object"||typeof r=="function")for(let i of D(r))!I.call(n,i)&&i!==o&&O(n,i,{get:()=>r[i],enumerable:!(l=_(r,i))||l.enumerable});return n};var U=n=>V(O({},"__esModule",{value:!0}),n);var W={};J(W,{default:()=>N});module.exports=U(W);var t=require("@raycast/api"),d=require("react");var k="http://127.0.0.1:3456";async function A(){try{let n=await fetch(`${k}/status`,{signal:AbortSignal.timeout(3e3)});if(!n.ok)throw new Error("Bridge not responding");let r=await n.json(),o=Object.entries(r).map(([s,c])=>({name:s,config:{command:""},tools:[],process:null,connected:c.connected,id:0})),h=(await(await fetch(`${k}/tools`,{signal:AbortSignal.timeout(3e3)})).json()).tools||[];for(let s of h){let c=o.find(g=>g.name===s.server);c&&c.tools.push({name:s.name,description:s.description})}let m=o.reduce((s,c)=>s+c.tools.length,0);return{running:!0,servers:o,toolCount:m}}catch{return{running:!1,servers:[],toolCount:0}}}async function B(){try{let n=await fetch(`${k}/tools`,{signal:AbortSignal.timeout(5e3)});return n.ok?((await n.json()).tools||[]).map(l=>({type:"function",function:{name:l.name,description:l.description,parameters:l.inputSchema||{type:"object",properties:{}}}})):[]}catch{return[]}}async function x(n,r){try{let o=await fetch(`${k}/call`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({toolName:n,args:r}),signal:AbortSignal.timeout(6e4)});return o.ok?await o.text():JSON.stringify({error:`Bridge error: ${o.status}`})}catch(o){return JSON.stringify({error:o.message})}}async function j(n){let r=await fetch(`${n}/api/tags`);if(!r.ok)throw new Error(`Failed to fetch models: ${r.status}`);return(await r.json()).models||[]}async function E(n,r,o,l,i,h){let m={model:r,messages:o,stream:!0};l.length>0&&(m.tools=l);let s=await fetch(`${n}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(m),signal:h});if(!s.ok){let f=await s.text();throw new Error(`Ollama error ${s.status}: ${f}`)}let c=s.body?.getReader();if(!c)throw new Error("No response body");let g=new TextDecoder,u="",w=[];for(;;){let{done:f,value:T}=await c.read();if(f)break;u+=g.decode(T,{stream:!0});let v=u.split(`
`);u=v.pop()||"";for(let S of v)if(S.trim())try{let p=JSON.parse(S);if(p.message?.content&&i.onToken(p.message.content),p.message?.tool_calls)for(let e of p.message.tool_calls)w.push(e);p.done&&(w.length>0&&i.onToolCalls(w),i.onDone())}catch{}}}var a=require("react/jsx-runtime");function z(n,r,o,l){let i=l.filter(s=>s.connected),h=i.length>0?`

> **MCP Tools:** ${i.map(s=>`${s.name} (${s.tools.length})`).join(", ")}`:"\n\n> \u26A0\uFE0F MCP Bridge not running. Start with: `node mcp-bridge.js`";return n.length===0&&!r?`# \u{1F999} Ollama + MCP Chat

**Model:** \`${o}\`${h}

Press **\u2318+N** to start chatting. **\u2318+T** to see tools.`:(r?[...n,{role:"assistant",content:r}]:n).map(s=>{if(s.role==="user")return`### \u{1F9D1} You

${s.content}`;if(s.role==="tool"){let c=s.content;try{let g=JSON.parse(s.content);g.content&&(c=g.content.map(u=>u.text||JSON.stringify(u)).join(`
`))}catch{}return`> \u{1F527} **${s.name||"Tool"}**
>
> ${c.split(`
`).join(`
> `)}`}if(s.role==="assistant"){let c=`### \u{1F916} ${o}

${s.content||"*(thinking...)*"}`;return s.tool_calls?.length&&(c+=`

`+s.tool_calls.map(g=>`\u{1F527} Calling \`${g.function.name}\`...`).join(`
`)),c}return""}).join(`

---

`)}function G({onSend:n}){let{pop:r}=(0,t.useNavigation)();return(0,a.jsx)(t.Form,{actions:(0,a.jsx)(t.ActionPanel,{children:(0,a.jsx)(t.Action.SubmitForm,{title:"Send",icon:t.Icon.Message,onSubmit:o=>{o.message.trim()&&(n(o.message.trim()),r())}})}),children:(0,a.jsx)(t.Form.TextField,{id:"message",title:"Message",placeholder:"Ask anything...",autoFocus:!0})})}function L({servers:n}){let r=n.filter(l=>l.connected),o=r.length===0?`# \u{1F527} No MCP Tools

MCP Bridge server is not running.

Start it from terminal:
\`\`\`
node mcp-bridge.js
\`\`\``:r.map(l=>`### ${l.name}

${l.tools.map(i=>`- **${i.name}**`).join(`
`)}`).join(`

---

`);return(0,a.jsx)(t.Detail,{markdown:o})}function R({model:n,servers:r,tools:o}){let[l,i]=(0,d.useState)([]),[h,m]=(0,d.useState)(""),[s,c]=(0,d.useState)(!1),g=(0,d.useRef)(null),u=(0,t.getPreferenceValues)().ollamaUrl||"http://localhost:11434",{push:w}=(0,t.useNavigation)(),f=(0,d.useCallback)(async S=>{c(!0),m("");let p=new AbortController;g.current=p;let e="",C=[];try{await new Promise(($,P)=>{E(u,n,S,o,{onToken:M=>{e+=M,m(e)},onToolCalls:M=>{C=M},onDone:()=>$(),onError:M=>P(M)},p.signal)})}catch($){$.name!=="AbortError"&&(0,t.showToast)(t.Toast.Style.Failure,"Error",$.message),c(!1);return}let b={role:"assistant",content:e,...C.length>0&&{tool_calls:C}},y=[...S,b];if(i(y),m(""),C.length>0){(0,t.showToast)(t.Toast.Style.Animated,"Executing tools...",`${C.length} tool(s)`);let $=[];for(let M of C){(0,t.showToast)(t.Toast.Style.Animated,`\u{1F527} ${M.function.name}`,"Running...");let F=await x(M.function.name,M.function.arguments||{});$.push({role:"tool",content:F,name:M.function.name,tool_call_id:M.id})}(0,t.showToast)(t.Toast.Style.Success,"Tools done",`${$.length} result(s)`);let P=[...y,...$];i(P),await f(P)}c(!1)},[n,u,o]),T=(0,d.useCallback)(async S=>{let p={role:"user",content:S},e=[...l,p];i(e),await f(e)},[l,f]),v=h||l.filter(S=>S.role==="assistant").pop()?.content||"";return(0,a.jsx)(t.Detail,{isLoading:s&&!h,markdown:z(l,h,n,r),actions:(0,a.jsxs)(t.ActionPanel,{children:[!s&&(0,a.jsx)(t.Action,{title:"New Message",icon:t.Icon.Message,shortcut:{modifiers:["cmd"],key:"n"},onAction:()=>w((0,a.jsx)(G,{onSend:T}))}),s&&(0,a.jsx)(t.Action,{title:"Stop",icon:t.Icon.Stop,onAction:()=>g.current?.abort()}),(0,a.jsx)(t.Action,{title:"View Tools",icon:t.Icon.WrenchScrewdriver,shortcut:{modifiers:["cmd"],key:"t"},onAction:()=>w((0,a.jsx)(L,{servers:r}))}),v&&(0,a.jsx)(t.Action.CopyToClipboard,{title:"Copy Response",content:v,shortcut:{modifiers:["cmd"],key:"c"}}),(0,a.jsx)(t.Action,{title:"Clear Chat",icon:t.Icon.Trash,shortcut:{modifiers:["cmd"],key:"k"},onAction:()=>{i([]),m("")}})]})})}function N(){let[n,r]=(0,d.useState)([]),[o,l]=(0,d.useState)([]),[i,h]=(0,d.useState)([]),[m,s]=(0,d.useState)(!0),[c,g]=(0,d.useState)(null),u=(0,t.getPreferenceValues)(),w=u.ollamaUrl||"http://localhost:11434",f=u.defaultModel||"",{push:T}=(0,t.useNavigation)();if((0,d.useEffect)(()=>{let e=!0;async function C(){try{let y=await j(w);e&&r(y)}catch(y){e&&g(y.message),s(!1);return}let b=await A();if(e&&(l(b.servers),b.running)){let y=await B();e&&h(y)}e&&s(!1)}return C(),()=>{e=!1}},[w]),(0,d.useEffect)(()=>{f&&n.length>0&&!m&&n.some(e=>e.name===f)&&T((0,a.jsx)(R,{model:f,servers:o,tools:i}))},[f,n,m,o,i,T]),c)return(0,a.jsx)(t.Detail,{markdown:`# \u274C Connection Error

Could not connect to Ollama at \`${w}\`

**Error:** ${c}

Make sure Ollama is running:
\`\`\`
ollama serve
\`\`\``});let v=e=>e>1e9?`${(e/1e9).toFixed(1)} GB`:`${(e/1e6).toFixed(0)} MB`,S=o.filter(e=>e.connected).length,p=i.length;return(0,a.jsxs)(t.List,{isLoading:m,searchBarPlaceholder:"Search models...",children:[o.length>0&&(0,a.jsx)(t.List.Section,{title:"MCP Servers",subtitle:`${S} connected, ${p} tools`,children:o.map(e=>(0,a.jsx)(t.List.Item,{title:e.name,subtitle:e.connected?`${e.tools.length} tool${e.tools.length!==1?"s":""}: ${e.tools.map(C=>C.name).slice(0,3).join(", ")}${e.tools.length>3?"...":""}`:"Disconnected",icon:e.connected?"\u2705":"\u274C"},e.name))}),!m&&o.length===0&&(0,a.jsx)(t.List.Section,{title:"MCP Servers",children:(0,a.jsx)(t.List.Item,{title:"Bridge not running",subtitle:"Start: node mcp-bridge.js",icon:"\u26A0\uFE0F"})}),(0,a.jsx)(t.List.Section,{title:"Local Models",subtitle:`${n.length} available`,children:n.map(e=>(0,a.jsx)(t.List.Item,{title:e.name,subtitle:`${v(e.size)}${e.details?.parameter_size?` \xB7 ${e.details.parameter_size}`:""}`,icon:"\u{1F999}",actions:(0,a.jsxs)(t.ActionPanel,{children:[(0,a.jsx)(t.Action,{title:`Chat with ${e.name}`,onAction:()=>T((0,a.jsx)(R,{model:e.name,servers:o,tools:i})),icon:t.Icon.Message}),(0,a.jsx)(t.Action,{title:"View Tools",icon:t.Icon.WrenchScrewdriver,shortcut:{modifiers:["cmd"],key:"t"},onAction:()=>T((0,a.jsx)(L,{servers:o}))})]})},e.name))})]})}
