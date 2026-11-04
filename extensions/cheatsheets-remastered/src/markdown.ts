import { isMap, parseDocument } from "yaml";

// Only a complete, valid YAML mapping at byte zero (or after BOM) is metadata.
// Unsupported/malformed/ambiguous blocks remain visible and source is never edited.
export function stripFrontmatter(source: string): string {
  const match = /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(source);
  if (!match || match.index !== 0 || match[1].length > 65536) return source;
  try {
    const doc = parseDocument(match[1], { schema: "failsafe", uniqueKeys: true });
    if (doc.errors.length || doc.warnings.length || !isMap(doc.contents) || !doc.contents.items.length) return source;
    return source.slice(match[0].length);
  } catch {
    return source;
  }
}

export function displayMarkdown(source: string, bundled = false): string {
  const body = stripFrontmatter(source);
  if (!bundled) return body;
  let fence = "";
  let length = 0;
  return body
    .split(/(?<=\n)/)
    .filter((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (marker) {
        if (!fence) {
          fence = marker[1][0];
          length = marker[1].length;
        } else if (marker[1][0] === fence && marker[1].length >= length && /^ {0,3}(?:`+|~+)\s*$/.test(line))
          fence = "";
        return true;
      }
      if (fence) return true;
      return !/^\{(?::[^\r\n]*|%\s*(?:raw|endraw)\s*%)\}[ \t]*(?:\r?\n)?$/.test(line);
    })
    .join("");
}
