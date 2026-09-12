import type { ExtractedItem } from "../extractUrls";

// Migrated verbatim from the v1.1.0 extractUrls regex (was: const URL_REGEX = ...)
const HTTP_REGEX = /https?:\/\/[^\s<>"'`,\][]*[^\s<>"'`,\][.);:]/g;

export function extractHttp(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(HTTP_REGEX)) {
    const raw = match[0];
    items.push({
      raw,
      url: raw, // http(s) URLs need no normalization
      type: "web",
      index: match.index ?? 0,
    });
  }
  return items;
}
