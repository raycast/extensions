import Base64 from "./base64";
import { HtmlToJSX } from "./htmlToJsx";

import got from "got";
import * as cheerio from "cheerio";

const API_ENTRY = "https://api.iconify.design";

export function toComponentName(icon: string) {
  return icon
    .split(/:|-|_/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1).toLowerCase())
    .join("");
}

async function getSvg(icon: string) {
  return await got(`${API_ENTRY}/${icon}.svg?height=1em`).text();
}

export function ClearSvg(svgCode: string, reactJSX?: boolean) {
  const keep = ["viewBox", "width", "height", "focusable", "xmlns", "xlink"];
  const $ = cheerio.load(svgCode);
  for (const key of Object.values($("svg").attr() || {})) {
    if (keep.includes(key)) continue;
    $("svg").removeAttr(key);
  }

  return HtmlToJSX($.html("svg"), reactJSX);
}

export function SvgToJSX(svg: string, name: string, snippet: boolean) {
  const code = `
export function ${name}(props) {
  return (
    ${ClearSvg(svg, true).replace(/<svg (.*?)>/, "<svg $1 {...props}>")}
  )
}`;
  if (snippet) return code;
  else return `import React from 'react'\n${code}\nexport default ${name}`;
}

export function SvgToTSX(svg: string, name: string, snippet: boolean) {
  const code = `
export function ${name}(props: SVGProps<SVGSVGElement>) {
  return (
    ${ClearSvg(svg, true).replace(/<svg (.*?)>/, "<svg $1 {...props}>")}
  )
}`;
  if (snippet) return code;
  else return `import React, { SVGProps } from 'react'\n${code}\nexport default ${name}`;
}

export function SvgToVue(svg: string, name: string) {
  return `
<template>
  ${ClearSvg(svg)}
</template>
<script>
export default {
  name: '${name}'
}
</script>`;
}

export function SvgToSvelte(svg: string) {
  return ClearSvg(svg);
}

export async function getIconSnippet(icon: string, type: string, snippet = true): Promise<string | undefined> {
  if (!icon) return;

  const url = `${API_ENTRY}/${icon}.svg`;

  switch (type) {
    case "id":
      return icon;
    case "url":
      return url;
    case "html":
      return `<span class="iconify" data-icon="${icon}" data-inline="false"></span>`;
    case "css":
      return `background: url('${url}') no-repeat center center / contain;`;
    case "svg":
      return await getSvg(icon);
    case "data_url":
      return `data:image/svg+xml;base64,${Base64.encode(await getSvg(icon))}`;
    case "pure-jsx":
      return ClearSvg(await getSvg(icon));
    case "jsx":
      return SvgToJSX(await getSvg(icon), toComponentName(icon), snippet);
    case "tsx":
      return SvgToTSX(await getSvg(icon), toComponentName(icon), snippet);
    case "vue":
      return SvgToVue(await getSvg(icon), toComponentName(icon));
    case "svelte":
      return SvgToSvelte(await getSvg(icon));
    case "unplugin":
      return `import ${toComponentName(icon)} from '~icons/${icon.split(":")[0]}/${icon.split(":")[1]}'`;
  }
}
