"use strict";var Q=Object.create;var M=Object.defineProperty;var Z=Object.getOwnPropertyDescriptor;var tt=Object.getOwnPropertyNames;var et=Object.getPrototypeOf,nt=Object.prototype.hasOwnProperty;var at=(t,e)=>{for(var n in e)M(t,n,{get:e[n],enumerable:!0})},T=(t,e,n,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of tt(e))!nt.call(t,r)&&r!==n&&M(t,r,{get:()=>e[r],enumerable:!(i=Z(e,r))||i.enumerable});return t};var rt=(t,e,n)=>(n=t!=null?Q(et(t)):{},T(e||!t||!t.__esModule?M(n,"default",{value:t,enumerable:!0}):n,t)),it=t=>T(M({},"__esModule",{value:!0}),t);var ut={};at(ut,{default:()=>G});module.exports=it(ut);var O=require("@raycast/api"),$=require("react");var _=require("@raycast/api"),ot="dicelab:aliases";async function W(){let t=await _.LocalStorage.getItem(ot);if(!t)return{};try{return JSON.parse(t)}catch{return{}}}var L=require("@raycast/api"),j=rt(require("path")),C=null,R=null;async function B(){return C||(R||(R=(async()=>{let t=j.default.join(L.environment.assetsPath,"wasm","dicebook.js");try{return require(t)}catch(e){throw console.error("Failed to load WASM module:",e),new Error(`Failed to load Dicelab engine: ${e instanceof Error?e.message:String(e)}`)}})()),C=await R,C)}var H="raycast-dicelab";var z=null,D=null;async function V(){return z||(D||(D=(async()=>{let t=await B(),e=new t.WasmEngine(H),n=await W();return Object.keys(n).length>0&&e.setAliases(n),e})()),z=await D,z)}var x=require("@raycast/api");var st={width:500,height:250,barColor:"#50A0FF",backgroundColor:"transparent",textColor:"#FFFFFF",title:""};function Y(t,e={}){let n={...st,...e},{width:i,height:r,barColor:s,backgroundColor:y,textColor:o,title:u}=n;if(t.length===0)return lt(i,r,o);let c=Math.max(...t.map(g=>g.probability)),a={top:u?30:10,right:10,bottom:40,left:50},m=i-a.left-a.right,l=r-a.top-a.bottom,d=Math.max(2,Math.floor(m/t.length)-1),A=1,F=t.map((g,f)=>{let w=c>0?g.probability/c*l:0,P=a.left+f*(d+A),k=a.top+l-w;return`<rect x="${P}" y="${k}" width="${d}" height="${w}" fill="${s}" opacity="0.8"/>`}).join(`
`),S=Math.max(1,Math.ceil(t.length/10)),N=t.filter((g,f)=>f%S===0||f===t.length-1).map(g=>{let f=t.findIndex(k=>k.label===g.label),w=a.left+f*(d+A)+d/2,P=r-10;return`<text x="${w}" y="${P}" text-anchor="middle" fill="${o}" font-size="10">${U(g.label)}</text>`}).join(`
`),p=5,v=Array.from({length:p+1},(g,f)=>{let w=c/p*f,P=a.top+l-f/p*l,k=`${(w*100).toFixed(0)}%`;return`<text x="${a.left-5}" y="${P+4}" text-anchor="end" fill="${o}" font-size="10">${k}</text>`}).join(`
`),E=u?`<text x="${i/2}" y="20" text-anchor="middle" fill="${o}" font-size="14" font-weight="bold">${U(u)}</text>`:"";return`<svg xmlns="http://www.w3.org/2000/svg" width="${i}" height="${r}" viewBox="0 0 ${i} ${r}">
  <rect width="${i}" height="${r}" fill="${y}"/>
  ${E}
  ${F}
  ${N}
  ${v}
  <line x1="${a.left}" y1="${a.top+l}" x2="${a.left+m}" y2="${a.top+l}" stroke="${o}" stroke-opacity="0.3"/>
  <line x1="${a.left}" y1="${a.top}" x2="${a.left}" y2="${a.top+l}" stroke="${o}" stroke-opacity="0.3"/>
</svg>`}function lt(t,e,n){return`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${e}">
  <text x="${t/2}" y="${e/2}" text-anchor="middle" fill="${n}" font-size="14">No data</text>
</svg>`}function X(t){return`data:image/svg+xml,${encodeURIComponent(t).replace(/'/g,"%27").replace(/"/g,"%22")}`}function U(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function b(t){if(typeof t=="number")return Number.isFinite(t)?t:null;if(t==null)return null;let e=Number.parseFloat(String(t));return Number.isFinite(e)?e:null}function ct(t){let e=b(t);return e===null||Number.isNaN(e)||e<0?0:e}function dt(t){let e=t,n=ct(e?.probability),i=e?.value,r=b(i);return{probability:n,label:String(r!==null?r:i??"?"),rawProbability:e?.probability,rawValue:i}}function I(t){let e=t;return{pmfs:(Array.isArray(e?.pmfs)?e.pmfs:[]).map(r=>{let s=r,o=(Array.isArray(s?.bins)?s.bins:[]).map(p=>dt(p)),u=o.reduce((p,v)=>Math.max(p,v.probability),0),c=b(s?.mean),a=c===null?null:Number(c.toFixed(4)),m=b(s?.variance),l=m===null?null:Number(m.toFixed(4)),d=b(s?.std_dev??s?.stdDev),A=d===null?null:Number(d.toFixed(4)),F=b(s?.interquartile_range??s?.iqr??s?.interquartileRange),S=F===null?null:Number(Math.max(F,0).toFixed(4)),N=Array.isArray(s?.quantiles)?s.quantiles.map(p=>{let v=p,E=b(v?.quantile),g=b(v?.value);return E===null||g===null?null:{quantile:Number(E.toFixed(4)),value:Number(g.toFixed(4))}}).filter(p=>p!==null):[];return{mean:a,variance:l,stdDev:A,iqr:S,quantiles:N,bins:o,maxProbability:Number.isFinite(u)?u:0,raw:r}})}}function J(t){let{pmfs:e}=I(t);if(!e.length)return"PMF available";let n=e[0],i=n.bins.map(d=>b(d.rawValue)).filter(d=>d!==null),r=i.length?Math.min(...i):null,s=i.length?Math.max(...i):null,y=n.mean===null||n.mean===void 0?"?":n.mean.toFixed(2),o=n.stdDev===null||n.stdDev===void 0?"?":n.stdDev.toFixed(2),u=n.variance===null||n.variance===void 0?"?":n.variance.toFixed(2),c=n.iqr===null||n.iqr===void 0?"?":n.iqr.toFixed(2),a=n.quantiles.length?n.quantiles.map(d=>`q${(d.quantile*100).toFixed(0)} ${d.value.toFixed(2)}`).join(", "):null,m=`${r??"?"}..${s??"?"}`,l=[`PMF mean ${y}`,`std ${o}`,`var ${u}`,`IQR ${c}`,`range ${m}`];return a&&l.push(a),l.join("; ")}var h=require("react/jsx-runtime");function K({expression:t,pmf:e}){let n=I(e),i=J(e);if(!n.pmfs.length)return(0,h.jsx)(x.Detail,{markdown:`# ${t}

No probability data available.`});let r=n.pmfs.map((o,u)=>{let c=o.bins.map(l=>({label:l.label,probability:l.probability})),a=Y(c,{width:500,height:250,title:n.pmfs.length>1?`Distribution #${u+1}`:void 0});return`![PMF Chart](${X(a)}?raycast-width=500&raycast-height=250)`}).join(`

`),s=n.pmfs.map((o,u)=>{let c=n.pmfs.length>1?`**Distribution #${u+1}**
`:"",a=o.bins[0]?.label??"?",m=o.bins[o.bins.length-1]?.label??"?";return`${c}| Statistic | Value |
|-----------|-------|
| Mean | ${o.mean?.toFixed(2)??"?"} |
| Std Dev | ${o.stdDev?.toFixed(2)??"?"} |
| Variance | ${o.variance?.toFixed(2)??"?"} |
| IQR | ${o.iqr?.toFixed(2)??"?"} |
| Range | ${a} - ${m} |`}).join(`

`),y=`# Probability Analysis

## Expression
\`${t}\`

## Distribution
${r}

## Statistics
${s}

---
*${i}*
`;return(0,h.jsx)(x.Detail,{markdown:y,actions:(0,h.jsxs)(x.ActionPanel,{children:[(0,h.jsx)(x.Action.CopyToClipboard,{title:"Copy Summary",content:i}),(0,h.jsx)(x.Action.CopyToClipboard,{title:"Copy Expression",content:t})]})})}var q=require("react/jsx-runtime");function G(t){let{expression:e}=t.arguments,[n,i]=(0,$.useState)(null),[r,s]=(0,$.useState)(null),[y,o]=(0,$.useState)(!0);return(0,$.useEffect)(()=>{async function u(){try{let c=await V(),a=e.trim().toLowerCase().startsWith("analyze")?e:`analyze ${e}`,m=c.evaluate(a),l=null;if(typeof m=="string")s("No probability data returned");else{let d=m;d.pmf?(l=d.pmf,i(l)):s("No probability data returned")}}catch(c){s(c instanceof Error?c.message:"Analysis failed")}finally{o(!1)}}u()},[e]),y?(0,q.jsx)(O.Detail,{isLoading:!0,markdown:"Analyzing expression..."}):r?(0,q.jsx)(O.Detail,{markdown:`# Error

${r}

## Expression
\`${e}\``}):(0,q.jsx)(K,{expression:e,pmf:n})}
