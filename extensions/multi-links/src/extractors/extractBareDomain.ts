import type { ExtractedItem } from "../extractUrls";
import { TLD_ALLOWLIST } from "./tldAllowlist";

// <subdomain>.<tld> where tld must pass allowlist. Boundary char-class on the LEFT prevents
// matching the host portion of a URL or email (./@/: are excluded).
// The optional path/query is captured so `example.com/foo?bar=baz` works.
const BARE_DOMAIN_REGEX =
  /(?<![a-zA-Z0-9@./:_-])([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.([a-zA-Z]{2,}))(?:\/[^\s<>"'`,\][]*)?/g;

export function extractBareDomain(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(BARE_DOMAIN_REGEX)) {
    const tld = match[2].toLowerCase();
    if (!TLD_ALLOWLIST.has(tld)) continue;

    // Strip the v1.1.0-style trailing punctuation
    const raw = match[0].replace(/[.,;:)\]]+$/, "");

    // Skip www.-prefixed matches — extractWww handles those.
    if (/^www\./i.test(raw)) continue;

    items.push({
      raw,
      url: `https://${raw}`,
      type: "web",
      index: match.index ?? 0,
    });
  }
  return items;
}
