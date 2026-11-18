import { extractAbsPath } from "./extractors/extractAbsPath";
import { extractBareDomain } from "./extractors/extractBareDomain";
import { extractCustomScheme } from "./extractors/extractCustomScheme";
import { extractFileExt } from "./extractors/extractFileExt";
import { extractFileUri } from "./extractors/extractFileUri";
import { extractHttp } from "./extractors/extractHttp";
import { extractMailto } from "./extractors/extractMailto";
import { extractMarkdownLink } from "./extractors/extractMarkdownLink";
import { extractWww } from "./extractors/extractWww";

export type ExtractedType =
  | "web" // http(s)://, www., bare domain
  | "local-path" // /Users/..., ~/..., file://
  | "mailto" // mailto:, tel:, sms:
  | "custom-scheme" // obsidian://, raycast://, vscode://
  | "file-ext"; // foo.md, bar.pdf in plain text

export interface ExtractedItem {
  raw: string; // exact match from text
  url: string; // normalized form ready for open() (www.→https://, ~→homedir)
  type: ExtractedType;
  index: number; // text position; used for ordering
}

export function extractUrls(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];

  // 1. Markdown FIRST — captures items AND masks [text](url) spans so inner URLs
  //    don't get double-matched by subsequent extractors.
  const md = extractMarkdownLink(text);
  items.push(...md.items);
  const t = md.maskedText;

  // 2. Run all other extractors over the masked text.
  items.push(...extractHttp(t));
  items.push(...extractWww(t));
  items.push(...extractBareDomain(t));
  items.push(...extractFileUri(t));
  items.push(...extractAbsPath(t));
  items.push(...extractMailto(t));
  items.push(...extractCustomScheme(t));
  items.push(...extractFileExt(t));

  // 3. Sort by text-position.
  items.sort((a, b) => a.index - b.index);

  // 4. Dedupe by url (Map preserves first-seen ordering).
  const seen = new Map<string, ExtractedItem>();
  for (const item of items) {
    if (!seen.has(item.url)) seen.set(item.url, item);
  }
  return Array.from(seen.values());
}
