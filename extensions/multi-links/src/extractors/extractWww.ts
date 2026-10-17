import type { ExtractedItem } from "../extractUrls";

// www.<host> where <host> contains at least one dot. Negative-lookbehind on `://`
// prevents matching `http://www.example.com` (already caught by extractHttp).
// Negative-lookbehind on word char prevents matching `nowww.example.com`.
const WWW_REGEX = /(?<![a-zA-Z0-9/:])www\.[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s<>"'`,\][]*)?/g;

export function extractWww(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(WWW_REGEX)) {
    const raw = match[0].replace(/[.,;:)\]]+$/, "");
    items.push({
      raw,
      url: `https://${raw}`,
      type: "web",
      index: match.index ?? 0,
    });
  }
  return items;
}
