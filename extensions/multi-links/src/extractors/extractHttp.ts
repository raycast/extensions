import type { ExtractedItem } from "../extractUrls";

// A standalone Chrome text-fragment URL can use commas inside the fragment.
const HTTP_REGEX =
  /^[\t ]*(https?:\/\/[^\s<>"'`,\][]*#:~:text=(?:[^\s<>"'`,\][]|,(?!https?:\/\/))+)[\t ]*$|https?:\/\/[^\s<>"'`,\][]*[^\s<>"'`,\][.);:]/gm;

export function extractHttp(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(HTTP_REGEX)) {
    const raw = match[1] ?? match[0];
    items.push({
      raw,
      url: raw, // http(s) URLs need no normalization
      type: "web",
      index: match.index + match[0].indexOf(raw),
    });
  }
  return items;
}
