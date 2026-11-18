import type { ScriptureLink } from "./types";

export const GAMALIEL_ORIGIN = "https://gamaliel.ai";

const RELATIVE_READ_LINK = /\]\((\/read\/[^)\s]+)\)/g;
const SCRIPTURE_MARKDOWN_LINK = /\[([^\]]+)\]\((https:\/\/gamaliel\.ai\/read\/[^)\s]+)\)/g;

export function absolutizeScriptureLinks(markdown: string): string {
  return markdown.replace(RELATIVE_READ_LINK, (_match, path: string) => `](${GAMALIEL_ORIGIN}${path})`);
}

export function extractScriptureLinks(markdown: string): ScriptureLink[] {
  const links: ScriptureLink[] = [];
  const seen = new Set<string>();

  for (const match of markdown.matchAll(SCRIPTURE_MARKDOWN_LINK)) {
    const label = match[1];
    const url = match[2];
    if (!label || !url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    links.push({ label, url });
  }

  return links;
}
