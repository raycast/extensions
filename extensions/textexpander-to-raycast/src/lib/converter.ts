import { convertMacros, hasTextExpanderMacros } from "./macros";
import type { Conversion, Library, RaycastSnippet, ReviewWarning, SnippetKind } from "./types";

export function snippetWarnings(snippet: RaycastSnippet, kind: SnippetKind): ReviewWarning[] {
  const warnings: ReviewWarning[] = [];
  const add = (code: ReviewWarning["code"], message: string, level: ReviewWarning["level"] = "warning") =>
    warnings.push({ code, level, message });
  if (kind === "rich") add("rich", "Rich-text formatting and images are omitted. Only plain text is exported.");
  if (kind === "applescript" || kind === "shell")
    add("script", "Script source is exported as text. Raycast snippets will not execute it.");
  if (kind === "unknown") add("unknown", "Unrecognized snippet type. Review the plain-text output.");
  if (hasTextExpanderMacros(snippet.text))
    add("macro", "Unsupported or unconverted TextExpander macros remain in this text. Review them before importing.");
  if (/\{(?:clipboard|cursor|date|time|datetime|day|uuid|snippet|argument|calculator)\b/.test(snippet.text)) {
    add("placeholder", "Raycast placeholders will expand when this snippet is used.", "info");
  }
  if (!snippet.keyword)
    add("no-keyword", "No keyword. This snippet will be available through Search Snippets.", "info");
  if (/[\s`'"\u2018\u2019\u201c\u201d]/u.test(snippet.keyword ?? "")) {
    add(
      "invalid-keyword",
      "This keyword contains characters Raycast cannot use for expansion. Edit the keyword before importing.",
    );
  }
  return warnings;
}

export function convertLibrary(library: Library, prefixGroups: boolean, translateMacros = false): Conversion {
  const result: Conversion = {
    snippets: [],
    skipped: [],
    suggestedCount: library.suggestedCount,
    duplicateCount: 0,
    emptyCount: 0,
  };
  const seen = new Set<string>();
  const keywordCounts = new Map<string, number>();
  for (const [index, source] of library.snippets.entries()) {
    const id = `${index}:${source.id}`;
    const title = source.label.trim() || source.abbreviation || "Untitled";
    const provenance = { id, group: source.group, name: title, sourcePath: source.sourcePath };
    if (!source.text) {
      result.emptyCount++;
      result.skipped.push({ ...provenance, reason: "empty" });
      continue;
    }
    const original: RaycastSnippet = {
      name: prefixGroups && source.group !== "Ungrouped" ? `[${source.group}] ${title}` : title,
      text: source.text,
      ...(source.abbreviation ? { keyword: source.abbreviation } : {}),
    };
    const translated =
      translateMacros && source.kind === "plain" ? convertMacros(source.text) : { text: source.text, changes: [] };
    const snippet = { ...original, text: translated.text };
    // Deduplicate source content, so translating different macros never hides a source record.
    const identity = JSON.stringify(original);
    if (seen.has(identity)) {
      result.duplicateCount++;
      result.skipped.push({ ...provenance, reason: "duplicate" });
      continue;
    }
    seen.add(identity);
    if (snippet.keyword) keywordCounts.set(snippet.keyword, (keywordCounts.get(snippet.keyword) ?? 0) + 1);
    result.snippets.push({
      id,
      group: source.group,
      kind: source.kind,
      sourcePath: source.sourcePath,
      original,
      snippet,
      changes: translated.changes,
      warnings: snippetWarnings(snippet, source.kind),
    });
  }
  for (const item of result.snippets) {
    if (item.snippet.keyword && (keywordCounts.get(item.snippet.keyword) ?? 0) > 1) {
      item.warnings.push({
        code: "keyword-conflict",
        level: "warning",
        message: "Another snippet in this export uses the same keyword.",
      });
    }
  }
  return result;
}
