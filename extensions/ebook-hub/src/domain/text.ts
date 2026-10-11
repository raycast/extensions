const CJK = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}";
/** Whitespace-delimited tokens; each CJK character counts as one word. */
const WORD_PATTERN = new RegExp(`[${CJK}]|[^\\s${CJK}]+`, "gu");

export function countWords(text: string): number {
  return text.match(WORD_PATTERN)?.length ?? 0;
}

/** Lowercase, strip diacritics (Vietnamese included), and collapse whitespace. */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/đ/g, "d").replace(/\s+/g, " ").trim();
}

export function matchesQuery(haystack: string, query: string): boolean {
  const normalizedHaystack = normalizeForSearch(haystack);
  return normalizeForSearch(query)
    .split(" ")
    .filter((token) => token !== "")
    .every((token) => normalizedHaystack.includes(token));
}

/** Plain text rendering of Markdown, good enough for excerpts and search. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^\s*(```|~~~).*$/gm, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  const characters = Array.from(text);
  return characters.length <= maxLength
    ? text
    : `${characters
        .slice(0, maxLength - 1)
        .join("")
        .trimEnd()}…`;
}

const BLOCK_SYNTAX = /^([#>*+\-=|`~])/;
const ORDERED_LIST = /^(\d+)([.)])/;

/**
 * Escape a line of untrusted plain text so Markdown block syntax at the start
 * of the line renders literally. Leading indentation is dropped because four
 * spaces would otherwise start a code block.
 */
export function escapeMarkdownLine(line: string): string {
  const trimmed = line.trimStart();
  const ordered = ORDERED_LIST.exec(trimmed);
  if (ordered) {
    return `${ordered[1]}\\${ordered[2]}${trimmed.slice(ordered[0].length)}`;
  }
  return trimmed.replace(BLOCK_SYNTAX, "\\$1");
}

export function splitList(value: string): string[] {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  return [...new Set(items)];
}
