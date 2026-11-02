import type { Conversion, Library, RaycastSnippet } from "./types";

export function convertLibrary(library: Library, prefixGroups: boolean): Conversion {
  const result: Conversion = {
    snippets: [],
    suggestedCount: library.suggestedCount,
    duplicateCount: 0,
    emptyCount: 0,
  };
  const seen = new Set<string>();
  const keywordCounts = new Map<string, number>();
  for (const [index, source] of library.snippets.entries()) {
    if (!source.text) {
      result.emptyCount++;
      continue;
    }
    const title = source.label.trim() || source.abbreviation || "Untitled";
    const snippet: RaycastSnippet = {
      name: prefixGroups && source.group !== "Ungrouped" ? `[${source.group}] ${title}` : title,
      text: source.text,
      ...(source.abbreviation ? { keyword: source.abbreviation } : {}),
    };
    const identity = JSON.stringify(snippet);
    if (seen.has(identity)) {
      result.duplicateCount++;
      continue;
    }
    seen.add(identity);

    const warnings: string[] = [];
    if (source.kind === "rich")
      warnings.push("Rich-text formatting and images are omitted. Only plain text is exported.");
    if (source.kind === "applescript" || source.kind === "shell") {
      warnings.push("Script source is exported as text. Raycast snippets will not execute it.");
    }
    if (source.kind === "unknown") warnings.push("Unrecognized snippet type. Review the plain-text output.");
    if (/%(?:[a-zA-Z]|\||\\)/.test(source.text)) {
      warnings.push("TextExpander macros are preserved as text. Replace them with Raycast placeholders if needed.");
    }
    if (/\{(?:clipboard|cursor|date|time|datetime|day|uuid|snippet|argument|calculator)\b/.test(source.text)) {
      warnings.push("This text contains Raycast placeholder syntax, which may expand when used in Raycast.");
    }
    if (!source.abbreviation) warnings.push("No keyword. This snippet will be available through Search Snippets.");
    if (/[\s`'"\u2018\u2019\u201c\u201d]/u.test(source.abbreviation)) {
      warnings.push(
        "This keyword contains whitespace, backticks, or quotation marks that Raycast cannot use for expansion. Edit it after import.",
      );
    }
    if (snippet.keyword) keywordCounts.set(snippet.keyword, (keywordCounts.get(snippet.keyword) ?? 0) + 1);
    result.snippets.push({
      id: `${index}:${source.id}`,
      group: source.group,
      kind: source.kind,
      snippet,
      warnings,
    });
  }
  for (const item of result.snippets) {
    if (item.snippet.keyword && (keywordCounts.get(item.snippet.keyword) ?? 0) > 1) {
      item.warnings.push("Another snippet in this export uses the same keyword.");
    }
  }
  return result;
}
