import { homedir } from "os";
import type { ExtractedItem } from "../extractUrls";
import { FILE_EXT_ALLOWLIST } from "./fileExtAllowlist";

// Path-y token containing a slash, ending in .<ext>. Examples that match:
//   docs/foo.md, ./report.pdf, ~/Downloads/file.zip, /tmp/data.json
// Examples that do NOT match (no slash in token):
//   report.pdf, version 1.84, foo.com
// The /Users/... and ~/... cases are ALSO caught by extractAbsPath; dedupe handles overlap.
//
// Strategy: anchor on a whitespace/start boundary (left); the token must contain
// at least one "/" before the trailing ".<ext>". Reject URL paths (http://host/x.md,
// file://path.md) via a variable-width negative lookbehind on a "scheme://" prefix.
const FILE_EXT_REGEX =
  /(?<![a-zA-Z0-9@:/])(?<![a-z][a-z0-9+.-]*:\/\/[^\s]{0,500})([~.]?[\w.-]*\/[^\s<>"'`,\][]*\.([a-zA-Z0-9]+))/g;

export function extractFileExt(text: string): ExtractedItem[] {
  const home = homedir();
  const items: ExtractedItem[] = [];
  for (const match of text.matchAll(FILE_EXT_REGEX)) {
    const ext = match[2].toLowerCase();
    if (!FILE_EXT_ALLOWLIST.has(ext)) continue;
    const raw = match[0].replace(/[.,;:)\]]+$/, "");
    const expanded = raw.startsWith("~/") ? raw.replace(/^~/, home) : raw;
    items.push({
      raw,
      url: expanded,
      type: "file-ext",
      index: match.index ?? 0,
    });
  }
  return items;
}
