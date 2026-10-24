import { homedir } from "os";
import type { ExtractedItem, ExtractedType } from "../extractUrls";
import { TLD_ALLOWLIST } from "./tldAllowlist";

// Inline markdown link: [text](url)
// Capture allows one level of balanced parentheses inside the URL so that
// links like [C](https://en.wikipedia.org/wiki/C_(programming_language)) keep
// their trailing paren instead of truncating at the first ")".
const MD_LINK_REGEX = /\[[^\]]*\]\(((?:[^()]|\([^()]*\))*)\)/g;

export interface MarkdownExtractResult {
  items: ExtractedItem[];
  maskedText: string;
}

export function extractMarkdownLink(text: string): MarkdownExtractResult {
  const items: ExtractedItem[] = [];
  // Mask matched ranges in a mutable copy: replace [text](url) with whitespace of the same length
  // (preserves indices for subsequent extractors).
  let masked = text;
  const matches = [...text.matchAll(MD_LINK_REGEX)];
  for (const m of matches) {
    const fullMatch = m[0];
    const url = m[1];
    const start = m.index ?? 0;
    const innerType = classifyInnerUrl(url);
    const normalizedUrl = normalizeInnerUrl(url, innerType);
    items.push({
      raw: fullMatch, // exact [text](url) source
      url: normalizedUrl, // ready for open()
      type: innerType,
      index: start,
    });
    // Replace the entire [text](url) span with spaces of the same length
    masked = masked.slice(0, start) + " ".repeat(fullMatch.length) + masked.slice(start + fullMatch.length);
  }
  return { items, maskedText: masked };
}

function classifyInnerUrl(url: string): ExtractedType {
  if (/^https?:\/\//i.test(url)) return "web";
  if (/^www\./i.test(url)) return "web";
  if (/^file:\/\//i.test(url)) return "local-path";
  if (url.startsWith("/") || url.startsWith("~/")) return "local-path";
  if (/^(?:mailto|tel|sms):/i.test(url)) return "mailto";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return "custom-scheme";
  // Heuristic: bare host with allowlisted TLD → web; otherwise file-ext fallback
  const tldMatch = url.match(/\.([a-zA-Z]{2,})(?:[/?#].*)?$/);
  if (tldMatch && TLD_ALLOWLIST.has(tldMatch[1].toLowerCase())) return "web";
  return "file-ext";
}

function normalizeInnerUrl(url: string, type: ExtractedType): string {
  if (type === "web") {
    if (/^https?:\/\//i.test(url)) return url;
    if (/^www\./i.test(url)) return `https://${url}`;
    // Bare allowlisted-TLD host
    return `https://${url}`;
  }
  if (type === "local-path" && url.startsWith("~/")) {
    return url.replace(/^~/, homedir());
  }
  return url;
}
