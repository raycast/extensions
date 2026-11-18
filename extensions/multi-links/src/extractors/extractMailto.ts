import type { ExtractedItem } from "../extractUrls";

// mailto:foo@bar.com, tel:+15551234, sms:+15551234
const MAILTO_REGEX = /\b(?:mailto|tel|sms):[^\s<>"'`,\][]+/g;

export function extractMailto(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(MAILTO_REGEX)) {
    const raw = match[0].replace(/[.,;:)\]]+$/, "");
    items.push({
      raw,
      url: raw,
      type: "mailto",
      index: match.index ?? 0,
    });
  }
  return items;
}
