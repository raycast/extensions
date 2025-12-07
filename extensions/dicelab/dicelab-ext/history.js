"use strict";var ct=Object.create;var I=Object.defineProperty;var dt=Object.getOwnPropertyDescriptor;var ut=Object.getOwnPropertyNames;var mt=Object.getPrototypeOf,pt=Object.prototype.hasOwnProperty;var ft=(t,e)=>{for(var n in e)I(t,n,{get:e[n],enumerable:!0})},V=(t,e,n,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of ut(e))!pt.call(t,o)&&o!==n&&I(t,o,{get:()=>e[o],enumerable:!(r=dt(e,o))||r.enumerable});return t};var gt=(t,e,n)=>(n=t!=null?ct(mt(t)):{},V(e||!t||!t.__esModule?I(n,"default",{value:t,enumerable:!0}):n,t)),yt=t=>V(I({},"__esModule",{value:!0}),t);var Pt={};ft(Pt,{default:()=>lt});module.exports=yt(Pt);var p=require("@raycast/api"),D=require("react");var S=require("@raycast/api"),U="dicelab:aliases",H="dicelab:history",bt=100;async function Y(){let t=await S.LocalStorage.getItem(U);if(!t)return{};try{return JSON.parse(t)}catch{return{}}}async function X(t){await S.LocalStorage.setItem(U,JSON.stringify(t))}async function O(){let t=await S.LocalStorage.getItem(H);if(!t)return[];try{return JSON.parse(t)}catch{return[]}}async function J(t){let e=await O(),n=[t,...e].slice(0,bt);await S.LocalStorage.setItem(H,JSON.stringify(n))}async function K(){await S.LocalStorage.removeItem(H)}var x=require("@raycast/api"),C=require("react");var G=require("@raycast/api"),Q=gt(require("path")),L=null,_=null;async function Z(){return L||(_||(_=(async()=>{let t=Q.default.join(G.environment.assetsPath,"wasm","dicebook.js");try{return require(t)}catch(e){throw console.error("Failed to load WASM module:",e),new Error(`Failed to load Dicelab engine: ${e instanceof Error?e.message:String(e)}`)}})()),L=await _,L)}var tt="raycast-dicelab";var q=null,W=null;async function et(){return q||(W||(W=(async()=>{let t=await Z(),e=new t.WasmEngine(tt),n=await Y();return Object.keys(n).length>0&&e.setAliases(n),e})()),q=await W,q)}async function nt(){if(!q)return;let t=q.getAliases();await X(t)}var k=require("@raycast/api");var xt={width:500,height:250,barColor:"#50A0FF",backgroundColor:"transparent",textColor:"#FFFFFF",title:""};function it(t,e={}){let n={...xt,...e},{width:r,height:o,barColor:s,backgroundColor:l,textColor:a,title:m}=n;if(t.length===0)return ht(r,o,a);let d=Math.max(...t.map(h=>h.probability)),i={top:m?30:10,right:10,bottom:40,left:50},y=r-i.left-i.right,c=o-i.top-i.bottom,u=Math.max(2,Math.floor(y/t.length)-1),M=1,$=t.map((h,v)=>{let R=d>0?h.probability/d*c:0,T=i.left+v*(u+M),z=i.top+c-R;return`<rect x="${T}" y="${z}" width="${u}" height="${R}" fill="${s}" opacity="0.8"/>`}).join(`
`),F=Math.max(1,Math.ceil(t.length/10)),A=t.filter((h,v)=>v%F===0||v===t.length-1).map(h=>{let v=t.findIndex(z=>z.label===h.label),R=i.left+v*(u+M)+u/2,T=o-10;return`<text x="${R}" y="${T}" text-anchor="middle" fill="${a}" font-size="10">${ot(h.label)}</text>`}).join(`
`),f=5,w=Array.from({length:f+1},(h,v)=>{let R=d/f*v,T=i.top+c-v/f*c,z=`${(R*100).toFixed(0)}%`;return`<text x="${i.left-5}" y="${T+4}" text-anchor="end" fill="${a}" font-size="10">${z}</text>`}).join(`
`),N=m?`<text x="${r/2}" y="20" text-anchor="middle" fill="${a}" font-size="14" font-weight="bold">${ot(m)}</text>`:"";return`<svg xmlns="http://www.w3.org/2000/svg" width="${r}" height="${o}" viewBox="0 0 ${r} ${o}">
  <rect width="${r}" height="${o}" fill="${l}"/>
  ${N}
  ${$}
  ${A}
  ${w}
  <line x1="${i.left}" y1="${i.top+c}" x2="${i.left+y}" y2="${i.top+c}" stroke="${a}" stroke-opacity="0.3"/>
  <line x1="${i.left}" y1="${i.top}" x2="${i.left}" y2="${i.top+c}" stroke="${a}" stroke-opacity="0.3"/>
</svg>`}function ht(t,e,n){return`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${e}">
  <text x="${t/2}" y="${e/2}" text-anchor="middle" fill="${n}" font-size="14">No data</text>
</svg>`}function rt(t){return`data:image/svg+xml,${encodeURIComponent(t).replace(/'/g,"%27").replace(/"/g,"%22")}`}function ot(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function P(t){if(typeof t=="number")return Number.isFinite(t)?t:null;if(t==null)return null;let e=Number.parseFloat(String(t));return Number.isFinite(e)?e:null}function wt(t){let e=P(t);return e===null||Number.isNaN(e)||e<0?0:e}function vt(t){let e=t,n=wt(e?.probability),r=e?.value,o=P(r);return{probability:n,label:String(o!==null?o:r??"?"),rawProbability:e?.probability,rawValue:r}}function j(t){let e=t;return{pmfs:(Array.isArray(e?.pmfs)?e.pmfs:[]).map(o=>{let s=o,a=(Array.isArray(s?.bins)?s.bins:[]).map(f=>vt(f)),m=a.reduce((f,w)=>Math.max(f,w.probability),0),d=P(s?.mean),i=d===null?null:Number(d.toFixed(4)),y=P(s?.variance),c=y===null?null:Number(y.toFixed(4)),u=P(s?.std_dev??s?.stdDev),M=u===null?null:Number(u.toFixed(4)),$=P(s?.interquartile_range??s?.iqr??s?.interquartileRange),F=$===null?null:Number(Math.max($,0).toFixed(4)),A=Array.isArray(s?.quantiles)?s.quantiles.map(f=>{let w=f,N=P(w?.quantile),h=P(w?.value);return N===null||h===null?null:{quantile:Number(N.toFixed(4)),value:Number(h.toFixed(4))}}).filter(f=>f!==null):[];return{mean:i,variance:c,stdDev:M,iqr:F,quantiles:A,bins:a,maxProbability:Number.isFinite(m)?m:0,raw:o}})}}function at(t){let{pmfs:e}=j(t);if(!e.length)return"PMF available";let n=e[0],r=n.bins.map(u=>P(u.rawValue)).filter(u=>u!==null),o=r.length?Math.min(...r):null,s=r.length?Math.max(...r):null,l=n.mean===null||n.mean===void 0?"?":n.mean.toFixed(2),a=n.stdDev===null||n.stdDev===void 0?"?":n.stdDev.toFixed(2),m=n.variance===null||n.variance===void 0?"?":n.variance.toFixed(2),d=n.iqr===null||n.iqr===void 0?"?":n.iqr.toFixed(2),i=n.quantiles.length?n.quantiles.map(u=>`q${(u.quantile*100).toFixed(0)} ${u.value.toFixed(2)}`).join(", "):null,y=`${o??"?"}..${s??"?"}`,c=[`PMF mean ${l}`,`std ${a}`,`var ${m}`,`IQR ${d}`,`range ${y}`];return i&&c.push(i),c.join("; ")}var E=require("react/jsx-runtime");function st({expression:t,pmf:e}){let n=j(e),r=at(e);if(!n.pmfs.length)return(0,E.jsx)(k.Detail,{markdown:`# ${t}

No probability data available.`});let o=n.pmfs.map((a,m)=>{let d=a.bins.map(c=>({label:c.label,probability:c.probability})),i=it(d,{width:500,height:250,title:n.pmfs.length>1?`Distribution #${m+1}`:void 0});return`![PMF Chart](${rt(i)}?raycast-width=500&raycast-height=250)`}).join(`

`),s=n.pmfs.map((a,m)=>{let d=n.pmfs.length>1?`**Distribution #${m+1}**
`:"",i=a.bins[0]?.label??"?",y=a.bins[a.bins.length-1]?.label??"?";return`${d}| Statistic | Value |
|-----------|-------|
| Mean | ${a.mean?.toFixed(2)??"?"} |
| Std Dev | ${a.stdDev?.toFixed(2)??"?"} |
| Variance | ${a.variance?.toFixed(2)??"?"} |
| IQR | ${a.iqr?.toFixed(2)??"?"} |
| Range | ${i} - ${y} |`}).join(`

`),l=`# Probability Analysis

## Expression
\`${t}\`

## Distribution
${o}

## Statistics
${s}

---
*${r}*
`;return(0,E.jsx)(k.Detail,{markdown:l,actions:(0,E.jsxs)(k.ActionPanel,{children:[(0,E.jsx)(k.Action.CopyToClipboard,{title:"Copy Summary",content:r}),(0,E.jsx)(k.Action.CopyToClipboard,{title:"Copy Expression",content:t})]})})}var b=require("react/jsx-runtime");function B(t){let{expression:e}=t.arguments,[n,r]=(0,C.useState)(""),[o,s]=(0,C.useState)(null),[l,a]=(0,C.useState)(null),[m,d]=(0,C.useState)(!0),[i,y]=(0,C.useState)(!1);if((0,C.useEffect)(()=>{async function M(){try{let F=(await et()).evaluate(e),A,f=null;if(typeof F=="string")A=F;else{let w=F;A=w.result,f=w.pmf}r(A),s(f),await J({expression:e,result:A,timestamp:Date.now()}),e.trim().toLowerCase().startsWith("let ")&&await nt()}catch($){a($ instanceof Error?$.message:"Evaluation failed")}finally{d(!1)}}M()},[e]),m)return(0,b.jsx)(x.Detail,{isLoading:!0,markdown:"Rolling dice..."});if(l)return(0,b.jsx)(x.Detail,{markdown:`# Error

${l}

## Expression
\`${e}\``,actions:(0,b.jsx)(x.ActionPanel,{children:(0,b.jsx)(x.Action.CopyToClipboard,{title:"Copy Error",content:l})})});if(i&&o)return(0,b.jsx)(st,{expression:e,pmf:o});let c=o!=null,u=`# Result

\`\`\`
${n}
\`\`\`

## Expression
\`${e}\`
`;return(0,b.jsx)(x.Detail,{markdown:u,actions:(0,b.jsxs)(x.ActionPanel,{children:[(0,b.jsx)(x.Action.CopyToClipboard,{title:"Copy Result",content:n}),(0,b.jsx)(x.Action.CopyToClipboard,{title:"Copy Expression",content:e}),c&&(0,b.jsx)(x.Action,{title:"View Pmf Chart",onAction:()=>y(!0)})]})})}var g=require("react/jsx-runtime");function lt(){let[t,e]=(0,D.useState)([]),[n,r]=(0,D.useState)(!0);async function o(){r(!0);let l=await O();e(l),r(!1)}(0,D.useEffect)(()=>{o()},[]);async function s(){await K(),await o()}return n?(0,g.jsx)(p.List,{isLoading:!0}):t.length===0?(0,g.jsx)(p.List,{children:(0,g.jsx)(p.List.EmptyView,{title:"No History",description:"Your roll history will appear here"})}):(0,g.jsx)(p.List,{children:t.map((l,a)=>{let d=new Date(l.timestamp).toLocaleString();return(0,g.jsx)(p.List.Item,{title:l.expression,subtitle:l.result,accessories:[{text:d}],actions:(0,g.jsxs)(p.ActionPanel,{children:[(0,g.jsx)(p.Action.Push,{title:"Re-roll",target:(0,g.jsx)(B,{launchType:p.LaunchType.UserInitiated,arguments:{expression:l.expression}})}),(0,g.jsx)(p.Action.CopyToClipboard,{title:"Copy Expression",content:l.expression}),(0,g.jsx)(p.Action.CopyToClipboard,{title:"Copy Result",content:l.result}),(0,g.jsx)(p.Action,{title:"Clear History",onAction:s})]})},a)})})}
