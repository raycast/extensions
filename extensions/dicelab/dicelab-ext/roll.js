"use strict";var ot=Object.create;var N=Object.defineProperty;var it=Object.getOwnPropertyDescriptor;var at=Object.getOwnPropertyNames;var rt=Object.getPrototypeOf,st=Object.prototype.hasOwnProperty;var lt=(t,e)=>{for(var n in e)N(t,n,{get:e[n],enumerable:!0})},_=(t,e,n,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of at(e))!st.call(t,i)&&i!==n&&N(t,i,{get:()=>e[i],enumerable:!(a=it(e,i))||a.enumerable});return t};var ct=(t,e,n)=>(n=t!=null?ot(rt(t)):{},_(e||!t||!t.__esModule?N(n,"default",{value:t,enumerable:!0}):n,t)),dt=t=>_(N({},"__esModule",{value:!0}),t);var yt={};lt(yt,{default:()=>nt});module.exports=dt(yt);var g=require("@raycast/api"),A=require("react");var q=require("@raycast/api"),W="dicelab:aliases",L="dicelab:history",ut=100;async function j(){let t=await q.LocalStorage.getItem(W);if(!t)return{};try{return JSON.parse(t)}catch{return{}}}async function B(t){await q.LocalStorage.setItem(W,JSON.stringify(t))}async function mt(){let t=await q.LocalStorage.getItem(L);if(!t)return[];try{return JSON.parse(t)}catch{return[]}}async function H(t){let e=await mt(),n=[t,...e].slice(0,ut);await q.LocalStorage.setItem(L,JSON.stringify(n))}var V=require("@raycast/api"),U=ct(require("path")),D=null,T=null;async function Y(){return D||(T||(T=(async()=>{let t=U.default.join(V.environment.assetsPath,"wasm","dicebook.js");try{return require(t)}catch(e){throw console.error("Failed to load WASM module:",e),new Error(`Failed to load Dicelab engine: ${e instanceof Error?e.message:String(e)}`)}})()),D=await T,D)}var X="raycast-dicelab";var M=null,I=null;async function J(){return M||(I||(I=(async()=>{let t=await Y(),e=new t.WasmEngine(X),n=await j();return Object.keys(n).length>0&&e.setAliases(n),e})()),M=await I,M)}async function K(){if(!M)return;let t=M.getAliases();await B(t)}var P=require("@raycast/api");var pt={width:500,height:250,barColor:"#50A0FF",backgroundColor:"transparent",textColor:"#FFFFFF",title:""};function Q(t,e={}){let n={...pt,...e},{width:a,height:i,barColor:s,backgroundColor:y,textColor:r,title:d}=n;if(t.length===0)return ft(a,i,r);let u=Math.max(...t.map(b=>b.probability)),o={top:d?30:10,right:10,bottom:40,left:50},p=a-o.left-o.right,l=i-o.top-o.bottom,c=Math.max(2,Math.floor(p/t.length)-1),C=1,w=t.map((b,h)=>{let E=u>0?b.probability/u*l:0,S=o.left+h*(c+C),R=o.top+l-E;return`<rect x="${S}" y="${R}" width="${c}" height="${E}" fill="${s}" opacity="0.8"/>`}).join(`
`),k=Math.max(1,Math.ceil(t.length/10)),$=t.filter((b,h)=>h%k===0||h===t.length-1).map(b=>{let h=t.findIndex(R=>R.label===b.label),E=o.left+h*(c+C)+c/2,S=i-10;return`<text x="${E}" y="${S}" text-anchor="middle" fill="${r}" font-size="10">${G(b.label)}</text>`}).join(`
`),m=5,x=Array.from({length:m+1},(b,h)=>{let E=u/m*h,S=o.top+l-h/m*l,R=`${(E*100).toFixed(0)}%`;return`<text x="${o.left-5}" y="${S+4}" text-anchor="end" fill="${r}" font-size="10">${R}</text>`}).join(`
`),z=d?`<text x="${a/2}" y="20" text-anchor="middle" fill="${r}" font-size="14" font-weight="bold">${G(d)}</text>`:"";return`<svg xmlns="http://www.w3.org/2000/svg" width="${a}" height="${i}" viewBox="0 0 ${a} ${i}">
  <rect width="${a}" height="${i}" fill="${y}"/>
  ${z}
  ${w}
  ${$}
  ${x}
  <line x1="${o.left}" y1="${o.top+l}" x2="${o.left+p}" y2="${o.top+l}" stroke="${r}" stroke-opacity="0.3"/>
  <line x1="${o.left}" y1="${o.top}" x2="${o.left}" y2="${o.top+l}" stroke="${r}" stroke-opacity="0.3"/>
</svg>`}function ft(t,e,n){return`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${e}">
  <text x="${t/2}" y="${e/2}" text-anchor="middle" fill="${n}" font-size="14">No data</text>
</svg>`}function Z(t){return`data:image/svg+xml,${encodeURIComponent(t).replace(/'/g,"%27").replace(/"/g,"%22")}`}function G(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function v(t){if(typeof t=="number")return Number.isFinite(t)?t:null;if(t==null)return null;let e=Number.parseFloat(String(t));return Number.isFinite(e)?e:null}function gt(t){let e=v(t);return e===null||Number.isNaN(e)||e<0?0:e}function bt(t){let e=t,n=gt(e?.probability),a=e?.value,i=v(a);return{probability:n,label:String(i!==null?i:a??"?"),rawProbability:e?.probability,rawValue:a}}function O(t){let e=t;return{pmfs:(Array.isArray(e?.pmfs)?e.pmfs:[]).map(i=>{let s=i,r=(Array.isArray(s?.bins)?s.bins:[]).map(m=>bt(m)),d=r.reduce((m,x)=>Math.max(m,x.probability),0),u=v(s?.mean),o=u===null?null:Number(u.toFixed(4)),p=v(s?.variance),l=p===null?null:Number(p.toFixed(4)),c=v(s?.std_dev??s?.stdDev),C=c===null?null:Number(c.toFixed(4)),w=v(s?.interquartile_range??s?.iqr??s?.interquartileRange),k=w===null?null:Number(Math.max(w,0).toFixed(4)),$=Array.isArray(s?.quantiles)?s.quantiles.map(m=>{let x=m,z=v(x?.quantile),b=v(x?.value);return z===null||b===null?null:{quantile:Number(z.toFixed(4)),value:Number(b.toFixed(4))}}).filter(m=>m!==null):[];return{mean:o,variance:l,stdDev:C,iqr:k,quantiles:$,bins:r,maxProbability:Number.isFinite(d)?d:0,raw:i}})}}function tt(t){let{pmfs:e}=O(t);if(!e.length)return"PMF available";let n=e[0],a=n.bins.map(c=>v(c.rawValue)).filter(c=>c!==null),i=a.length?Math.min(...a):null,s=a.length?Math.max(...a):null,y=n.mean===null||n.mean===void 0?"?":n.mean.toFixed(2),r=n.stdDev===null||n.stdDev===void 0?"?":n.stdDev.toFixed(2),d=n.variance===null||n.variance===void 0?"?":n.variance.toFixed(2),u=n.iqr===null||n.iqr===void 0?"?":n.iqr.toFixed(2),o=n.quantiles.length?n.quantiles.map(c=>`q${(c.quantile*100).toFixed(0)} ${c.value.toFixed(2)}`).join(", "):null,p=`${i??"?"}..${s??"?"}`,l=[`PMF mean ${y}`,`std ${r}`,`var ${d}`,`IQR ${u}`,`range ${p}`];return o&&l.push(o),l.join("; ")}var F=require("react/jsx-runtime");function et({expression:t,pmf:e}){let n=O(e),a=tt(e);if(!n.pmfs.length)return(0,F.jsx)(P.Detail,{markdown:`# ${t}

No probability data available.`});let i=n.pmfs.map((r,d)=>{let u=r.bins.map(l=>({label:l.label,probability:l.probability})),o=Q(u,{width:500,height:250,title:n.pmfs.length>1?`Distribution #${d+1}`:void 0});return`![PMF Chart](${Z(o)}?raycast-width=500&raycast-height=250)`}).join(`

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
`;return(0,F.jsx)(P.Detail,{markdown:y,actions:(0,F.jsxs)(P.ActionPanel,{children:[(0,F.jsx)(P.Action.CopyToClipboard,{title:"Copy Summary",content:a}),(0,F.jsx)(P.Action.CopyToClipboard,{title:"Copy Expression",content:t})]})})}var f=require("react/jsx-runtime");function nt(t){let{expression:e}=t.arguments,[n,a]=(0,A.useState)(""),[i,s]=(0,A.useState)(null),[y,r]=(0,A.useState)(null),[d,u]=(0,A.useState)(!0),[o,p]=(0,A.useState)(!1);if((0,A.useEffect)(()=>{async function C(){try{let k=(await J()).evaluate(e),$,m=null;if(typeof k=="string")$=k;else{let x=k;$=x.result,m=x.pmf}a($),s(m),await H({expression:e,result:$,timestamp:Date.now()}),e.trim().toLowerCase().startsWith("let ")&&await K()}catch(w){r(w instanceof Error?w.message:"Evaluation failed")}finally{u(!1)}}C()},[e]),d)return(0,f.jsx)(g.Detail,{isLoading:!0,markdown:"Rolling dice..."});if(y)return(0,f.jsx)(g.Detail,{markdown:`# Error

${y}

## Expression
\`${e}\``,actions:(0,f.jsx)(g.ActionPanel,{children:(0,f.jsx)(g.Action.CopyToClipboard,{title:"Copy Error",content:y})})});if(o&&i)return(0,f.jsx)(et,{expression:e,pmf:i});let l=i!=null,c=`# Result

\`\`\`
${n}
\`\`\`

## Expression
\`${e}\`
`;return(0,f.jsx)(g.Detail,{markdown:c,actions:(0,f.jsxs)(g.ActionPanel,{children:[(0,f.jsx)(g.Action.CopyToClipboard,{title:"Copy Result",content:n}),(0,f.jsx)(g.Action.CopyToClipboard,{title:"Copy Expression",content:e}),l&&(0,f.jsx)(g.Action,{title:"View Pmf Chart",onAction:()=>p(!0)})]})})}
