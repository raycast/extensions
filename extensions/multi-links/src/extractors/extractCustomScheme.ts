import type { ExtractedItem } from "../extractUrls";

// <scheme>://<rest>  where scheme is alpha-starting + alphanumeric/+/./- chars
const CUSTOM_SCHEME_REGEX = /\b([a-z][a-z0-9+.-]*?):\/\/[^\s<>"'`,\][]+/gi;

const RESERVED_SCHEMES = new Set(["http", "https", "file"]);

export function extractCustomScheme(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(CUSTOM_SCHEME_REGEX)) {
    const scheme = match[1].toLowerCase();
    if (RESERVED_SCHEMES.has(scheme)) continue;
    const raw = match[0].replace(/[.,;:)\]]+$/, "");
    items.push({
      raw,
      url: raw,
      type: "custom-scheme",
      index: match.index ?? 0,
    });
  }
  return items;
}
