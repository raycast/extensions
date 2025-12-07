"use strict";var rt=Object.create;var D=Object.defineProperty;var st=Object.getOwnPropertyDescriptor;var lt=Object.getOwnPropertyNames;var ct=Object.getPrototypeOf,dt=Object.prototype.hasOwnProperty;var ut=(t,e)=>{for(var n in e)D(t,n,{get:e[n],enumerable:!0})},j=(t,e,n,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of lt(e))!dt.call(t,i)&&i!==n&&D(t,i,{get:()=>e[i],enumerable:!(a=st(e,i))||a.enumerable});return t};var mt=(t,e,n)=>(n=t!=null?rt(ct(t)):{},j(e||!t||!t.__esModule?D(n,"default",{value:t,enumerable:!0}):n,t)),pt=t=>j(D({},"__esModule",{value:!0}),t);var vt={};ut(vt,{default:()=>at});module.exports=pt(vt);var T=require("@raycast/api");var g=require("@raycast/api"),k=require("react");var q=require("@raycast/api"),B="dicelab:aliases",H="dicelab:history",ft=100;async function V(){let t=await q.LocalStorage.getItem(B);if(!t)return{};try{return JSON.parse(t)}catch{return{}}}async function U(t){await q.LocalStorage.setItem(B,JSON.stringify(t))}async function gt(){let t=await q.LocalStorage.getItem(H);if(!t)return[];try{return JSON.parse(t)}catch{return[]}}async function Y(t){let e=await gt(),n=[t,...e].slice(0,ft);await q.LocalStorage.setItem(H,JSON.stringify(n))}var X=require("@raycast/api"),J=mt(require("path")),N=null,O=null;async function K(){return N||(O||(O=(async()=>{let t=J.default.join(X.environment.assetsPath,"wasm","dicebook.js");try{return require(t)}catch(e){throw console.error("Failed to load WASM module:",e),new Error(`Failed to load Dicelab engine: ${e instanceof Error?e.message:String(e)}`)}})()),N=await O,N)}var G="raycast-dicelab";var M=null,L=null;async function Q(){return M||(L||(L=(async()=>{let t=await K(),e=new t.WasmEngine(G),n=await V();return Object.keys(n).length>0&&e.setAliases(n),e})()),M=await L,M)}async function Z(){if(!M)return;let t=M.getAliases();await U(t)}var $=require("@raycast/api");var bt={width:500,height:250,barColor:"#50A0FF",backgroundColor:"transparent",textColor:"#FFFFFF",title:""};function et(t,e={}){let n={...bt,...e},{width:a,height:i,barColor:s,backgroundColor:y,textColor:r,title:d}=n;if(t.length===0)return yt(a,i,r);let u=Math.max(...t.map(b=>b.probability)),o={top:d?30:10,right:10,bottom:40,left:50},p=a-o.left-o.right,l=i-o.top-o.bottom,c=Math.max(2,Math.floor(p/t.length)-1),C=1,w=t.map((b,h)=>{let E=u>0?b.probability/u*l:0,R=o.left+h*(c+C),S=o.top+l-E;return`<rect x="${R}" y="${S}" width="${c}" height="${E}" fill="${s}" opacity="0.8"/>`}).join(`
`),A=Math.max(1,Math.ceil(t.length/10)),P=t.filter((b,h)=>h%A===0||h===t.length-1).map(b=>{let h=t.findIndex(S=>S.label===b.label),E=o.left+h*(c+C)+c/2,R=i-10;return`<text x="${E}" y="${R}" text-anchor="middle" fill="${r}" font-size="10">${tt(b.label)}</text>`}).join(`
`),m=5,x=Array.from({length:m+1},(b,h)=>{let E=u/m*h,R=o.top+l-h/m*l,S=`${(E*100).toFixed(0)}%`;return`<text x="${o.left-5}" y="${R+4}" text-anchor="end" fill="${r}" font-size="10">${S}</text>`}).join(`
`),z=d?`<text x="${a/2}" y="20" text-anchor="middle" fill="${r}" font-size="14" font-weight="bold">${tt(d)}</text>`:"";return`<svg xmlns="http://www.w3.org/2000/svg" width="${a}" height="${i}" viewBox="0 0 ${a} ${i}">
  <rect width="${a}" height="${i}" fill="${y}"/>
  ${z}
  ${w}
  ${P}
  ${x}
  <line x1="${o.left}" y1="${o.top+l}" x2="${o.left+p}" y2="${o.top+l}" stroke="${r}" stroke-opacity="0.3"/>
  <line x1="${o.left}" y1="${o.top}" x2="${o.left}" y2="${o.top+l}" stroke="${r}" stroke-opacity="0.3"/>
</svg>`}function yt(t,e,n){return`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${e}">
  <text x="${t/2}" y="${e/2}" text-anchor="middle" fill="${n}" font-size="14">No data</text>
</svg>`}function nt(t){return`data:image/svg+xml,${encodeURIComponent(t).replace(/'/g,"%27").replace(/"/g,"%22")}`}function tt(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function v(t){if(typeof t=="number")return Number.isFinite(t)?t:null;if(t==null)return null;let e=Number.parseFloat(String(t));return Number.isFinite(e)?e:null}function xt(t){let e=v(t);return e===null||Number.isNaN(e)||e<0?0:e}function ht(t){let e=t,n=xt(e?.probability),a=e?.value,i=v(a);return{probability:n,label:String(i!==null?i:a??"?"),rawProbability:e?.probability,rawValue:a}}function _(t){let e=t;return{pmfs:(Array.isArray(e?.pmfs)?e.pmfs:[]).map(i=>{let s=i,r=(Array.isArray(s?.bins)?s.bins:[]).map(m=>ht(m)),d=r.reduce((m,x)=>Math.max(m,x.probability),0),u=v(s?.mean),o=u===null?null:Number(u.toFixed(4)),p=v(s?.variance),l=p===null?null:Number(p.toFixed(4)),c=v(s?.std_dev??s?.stdDev),C=c===null?null:Number(c.toFixed(4)),w=v(s?.interquartile_range??s?.iqr??s?.interquartileRange),A=w===null?null:Number(Math.max(w,0).toFixed(4)),P=Array.isArray(s?.quantiles)?s.quantiles.map(m=>{let x=m,z=v(x?.quantile),b=v(x?.value);return z===null||b===null?null:{quantile:Number(z.toFixed(4)),value:Number(b.toFixed(4))}}).filter(m=>m!==null):[];return{mean:o,variance:l,stdDev:C,iqr:A,quantiles:P,bins:r,maxProbability:Number.isFinite(d)?d:0,raw:i}})}}function ot(t){let{pmfs:e}=_(t);if(!e.length)return"PMF available";let n=e[0],a=n.bins.map(c=>v(c.rawValue)).filter(c=>c!==null),i=a.length?Math.min(...a):null,s=a.length?Math.max(...a):null,y=n.mean===null||n.mean===void 0?"?":n.mean.toFixed(2),r=n.stdDev===null||n.stdDev===void 0?"?":n.stdDev.toFixed(2),d=n.variance===null||n.variance===void 0?"?":n.variance.toFixed(2),u=n.iqr===null||n.iqr===void 0?"?":n.iqr.toFixed(2),o=n.quantiles.length?n.quantiles.map(c=>`q${(c.quantile*100).toFixed(0)} ${c.value.toFixed(2)}`).join(", "):null,p=`${i??"?"}..${s??"?"}`,l=[`PMF mean ${y}`,`std ${r}`,`var ${d}`,`IQR ${u}`,`range ${p}`];return o&&l.push(o),l.join("; ")}var F=require("react/jsx-runtime");function it({expression:t,pmf:e}){let n=_(e),a=ot(e);if(!n.pmfs.length)return(0,F.jsx)($.Detail,{markdown:`# ${t}

No probability data available.`});let i=n.pmfs.map((r,d)=>{let u=r.bins.map(l=>({label:l.label,probability:l.probability})),o=et(u,{width:500,height:250,title:n.pmfs.length>1?`Distribution #${d+1}`:void 0});return`![PMF Chart](${nt(o)}?raycast-width=500&raycast-height=250)`}).join(`

`),s=n.pmfs.map((r,d)=>{let u=n.pmfs.length>1?`**Distribution #${d+1}**
`:"",o=r.bins[0]?.label??"?",p=r.bins[r.bins.length-1]?.label??"?";return`${u}| Statistic | Value |
|-----------|-------|
| Mean | ${r.mean?.toFixed(2)??"?"} |
| Std Dev | ${r.stdDev?.toFixed(2)??"?"} |
| Variance | ${r.variance?.toFixed(2)??"?"} |
| IQR | ${r.iqr?.toFixed(2)??"?"} |
| Range | ${o} - ${p} |`}).join(`

`),y=`# Probability Analysis

## Expression
\`${t}\`

## Distribution
${i}

## Statistics
${s}

---
*${a}*
`;return(0,F.jsx)($.Detail,{markdown:y,actions:(0,F.jsxs)($.ActionPanel,{children:[(0,F.jsx)($.Action.CopyToClipboard,{title:"Copy Summary",content:a}),(0,F.jsx)($.Action.CopyToClipboard,{title:"Copy Expression",content:t})]})})}var f=require("react/jsx-runtime");function W(t){let{expression:e}=t.arguments,[n,a]=(0,k.useState)(""),[i,s]=(0,k.useState)(null),[y,r]=(0,k.useState)(null),[d,u]=(0,k.useState)(!0),[o,p]=(0,k.useState)(!1);if((0,k.useEffect)(()=>{async function C(){try{let A=(await Q()).evaluate(e),P,m=null;if(typeof A=="string")P=A;else{let x=A;P=x.result,m=x.pmf}a(P),s(m),await Y({expression:e,result:P,timestamp:Date.now()}),e.trim().toLowerCase().startsWith("let ")&&await Z()}catch(w){r(w instanceof Error?w.message:"Evaluation failed")}finally{u(!1)}}C()},[e]),d)return(0,f.jsx)(g.Detail,{isLoading:!0,markdown:"Rolling dice..."});if(y)return(0,f.jsx)(g.Detail,{markdown:`# Error

${y}

## Expression
\`${e}\``,actions:(0,f.jsx)(g.ActionPanel,{children:(0,f.jsx)(g.Action.CopyToClipboard,{title:"Copy Error",content:y})})});if(o&&i)return(0,f.jsx)(it,{expression:e,pmf:i});let l=i!=null,c=`# Result

\`\`\`
${n}
\`\`\`

## Expression
\`${e}\`
`;return(0,f.jsx)(g.Detail,{markdown:c,actions:(0,f.jsxs)(g.ActionPanel,{children:[(0,f.jsx)(g.Action.CopyToClipboard,{title:"Copy Result",content:n}),(0,f.jsx)(g.Action.CopyToClipboard,{title:"Copy Expression",content:e}),l&&(0,f.jsx)(g.Action,{title:"View Pmf Chart",onAction:()=>p(!0)})]})})}var I=require("react/jsx-runtime");function at(t){let e=t.fallbackText??t.launchContext?.fallbackText??"";return/\d*d\d+|d20|d100|analyze/i.test(e)&&e.trim()?(0,I.jsx)(W,{launchType:T.LaunchType.UserInitiated,arguments:{expression:e}}):(0,I.jsx)(T.List,{children:(0,I.jsx)(T.List.EmptyView,{title:"Not a Dice Expression",description:'Try "d20", "2d6+4", or use the Roll Dice command'})})}
