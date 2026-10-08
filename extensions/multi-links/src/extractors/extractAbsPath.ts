import { homedir } from "os";
import type { ExtractedItem } from "../extractUrls";

// Absolute POSIX paths: /Users/..., /Applications/..., /tmp/..., /private/...
// Tilde-prefixed paths: ~/foo, ~/Documents/bar.md
// Path token continues until whitespace or quote/bracket terminator.
// Word-boundary on the left prevents matching the path portion of an http URL or file:// URI.
const ABS_PATH_REGEX = /(?<![a-zA-Z0-9/:_-])(~\/[^\s<>"'`,\][]+|\/[A-Za-z][^\s<>"'`,\][]*)/g;

export function extractAbsPath(text: string): ExtractedItem[] {
  const home = homedir();
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(ABS_PATH_REGEX)) {
    const raw = match[0].replace(/[.,;:)\]]+$/, "");
    // Reject obvious non-paths: `/foo` with no separator AND no dot is ambiguous,
    // but heuristic per LD-P2-05 says false positives are recoverable in P3.
    // Sole filter: must contain at least one `/` after the leading marker.
    if (!/\//.test(raw.slice(1))) continue;
    const expanded = raw.startsWith("~/") ? raw.replace(/^~/, home) : raw;
    items.push({
      raw,
      url: expanded,
      type: "local-path",
      index: match.index ?? 0,
    });
  }
  return items;
}
