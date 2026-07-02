"use strict";var i=Object.defineProperty;var d=Object.getOwnPropertyDescriptor;var p=Object.getOwnPropertyNames;var l=Object.prototype.hasOwnProperty;var m=(o,e)=>{for(var n in e)i(o,n,{get:e[n],enumerable:!0})},g=(o,e,n,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of p(e))!l.call(o,s)&&s!==n&&i(o,s,{get:()=>e[s],enumerable:!(a=d(e,s))||a.enumerable});return o};var f=o=>g(i({},"__esModule",{value:!0}),o);var u={};m(u,{default:()=>c});module.exports=f(u);var t=require("@raycast/api"),r=require("react/jsx-runtime");function c(){let{mcpConfigPath:o}=(0,t.getPreferenceValues)(),e=o.replace(/^~/,process.env.HOME||"/Users"),n=`cd "$(dirname "$0")" && node mcp-bridge.js --config "${e}"`,a=`# \u{1F527} MCP Bridge Server

The MCP Bridge runs **outside** the Raycast sandbox to connect to MCP servers.

## How to Start

Run this in your terminal:

\`\`\`bash
${n}
\`\`\`

Or navigate to the extension directory and run:

\`\`\`bash
cd ~/.cola/outputs/raycast-ollama
node mcp-bridge.js --config "${e}"
\`\`\`

## Status

TODO: Bridge status check will appear here.

## Why a separate process?

Raycast extensions run in a sandbox that blocks \`child_process.spawn\`.
The bridge runs as a standalone Node.js process and communicates via HTTP (port 3456).

## Config File

The bridge reads MCP server configs from:

\`${e}\`

Example config:

\`\`\`json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  }
}
\`\`\`
`;return(0,r.jsx)(t.Detail,{markdown:a,actions:(0,r.jsxs)(t.ActionPanel,{children:[(0,r.jsx)(t.Action.CopyToClipboard,{title:"Copy Bridge Command",content:n}),(0,r.jsx)(t.Action.OpenInBrowser,{title:"MCP Documentation",url:"https://modelcontextprotocol.io"})]})})}
