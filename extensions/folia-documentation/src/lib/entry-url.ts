import { GUIDES_BASE, docsBase } from "./constants";
import { DocEntry } from "./types";

// The one place that turns an entry back into a URL, now that DocEntry itself
// no longer stores one (see the comment on DocEntry.url's removal in types.ts).
export function entryUrl(entry: DocEntry): string {
  if (entry.kind === "guide") {
    const fragment = entry.anchor === "_top" ? "" : `#${entry.anchor}`;
    return `${GUIDES_BASE}${entry.page}${fragment}`;
  }
  return `${docsBase(entry.version ?? "")}${entry.page}#${entry.anchor}`;
}
