import type { ExtractedItem } from "../extractUrls";

// file:// URI scheme. Anchored on word boundary to avoid mid-token matches.
const FILE_URI_REGEX = /\bfile:\/\/[^\s<>"'`,\][]+/g;

export function extractFileUri(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(FILE_URI_REGEX)) {
    const raw = match[0].replace(/[.,;:)\]]+$/, "");
    items.push({
      raw,
      url: raw,
      type: "local-path",
      index: match.index ?? 0,
    });
  }
  return items;
}
