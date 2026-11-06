import { isMap, isScalar, isSeq, parseDocument } from "yaml";
import type { CustomCheatsheet } from "./models";

// Only a complete, valid YAML mapping at byte zero (or after BOM) is metadata.
// Unsupported/malformed/ambiguous blocks remain visible and source is never edited.
function frontmatter(source: string, schema: "failsafe" | "core" = "failsafe") {
  const match = /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(source);
  if (!match || match.index !== 0 || match[1].length > 65536) return undefined;
  try {
    const doc = parseDocument(match[1], { schema, uniqueKeys: true });
    if (doc.errors.length || doc.warnings.length || !isMap(doc.contents) || !doc.contents.items.length)
      return undefined;
    return { fields: doc.contents, end: match[0].length };
  } catch {
    return undefined;
  }
}

export function stripFrontmatter(source: string): string {
  const parsed = frontmatter(source);
  return parsed ? source.slice(parsed.end) : source;
}

export function repositoryMetadata(source: string): Partial<Pick<CustomCheatsheet, "title" | "description" | "tags">> {
  // Core schema distinguishes strings from booleans/numbers. Read nodes directly:
  // converting the document to JS would resolve untrusted aliases/recursive data.
  const parsed = frontmatter(source, "core");
  if (!parsed) return {};
  const text = (node: unknown, limit: number): string | undefined => {
    if (!isScalar(node) || typeof node.value !== "string" || node.value.length > limit) return undefined;
    const value = node.value.replace(/\s+/g, " ").trim();
    return value || undefined;
  };
  const metadata: Partial<Pick<CustomCheatsheet, "title" | "description" | "tags">> = {};
  const title = text(parsed.fields.get("title", true), 200);
  const description = text(parsed.fields.get("description", true), 1000);
  if (title) metadata.title = title;
  if (description) metadata.description = description;
  const tags = parsed.fields.get("tags", true);
  if (isSeq(tags) && tags.items.length <= 20) {
    const seen = new Set<string>();
    const values: string[] = [];
    for (const node of tags.items) {
      const value = text(node, 64);
      if (!value || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      values.push(value);
    }
    if (values.length) metadata.tags = values;
  }
  return metadata;
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

export function repositoryDisplayMarkdown(source: string, description?: string): string {
  const body = displayMarkdown(source);
  if (!description) return body;
  // Metadata is plain text. Escape ASCII punctuation so links, images and HTML
  // cannot become active Markdown when the full description wraps in the body.
  const literal = description.replace(/[!-/:-@[-`{-~]/g, "\\$&");
  return `${literal}\n\n---\n\n${body}`;
}
