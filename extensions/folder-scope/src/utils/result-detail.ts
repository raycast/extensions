import type { CaseMode } from "../types/preferences.ts";
import type { SearchOptions, SearchResult } from "../types/search.ts";

/** The subset of options that affects how a match is located for highlighting. */
export type HighlightOptions = Pick<SearchOptions, "searchMode" | "caseMode">;

function isCaseSensitive(query: string, caseMode: CaseMode): boolean {
  if (caseMode === "sensitive") return true;
  if (caseMode === "insensitive") return false;
  return query !== query.toLocaleLowerCase(); // smart case
}

/**
 * Best-effort location of the match inside `lineText` as a [start, end) span,
 * or null when it cannot be located reliably (invalid JS regex, truncated
 * preview, byte/char column drift). Highlighting is cosmetic — a miss must
 * degrade to "no bold", never to a wrong-looking result.
 */
export function locateMatch(
  lineText: string,
  column: number,
  query: string,
  options: HighlightOptions,
): [number, number] | null {
  if (query.length === 0 || lineText.length === 0) return null;
  const start = Math.max(0, column - 1);

  if (options.searchMode === "regex") {
    let re: RegExp;
    try {
      // ponytail: JS regex ≈ ripgrep's Rust regex for common patterns; on
      // syntax divergence we simply skip highlighting.
      re = new RegExp(query, isCaseSensitive(query, options.caseMode) ? "g" : "gi");
    } catch {
      return null;
    }
    let first: [number, number] | null = null;
    for (let match = re.exec(lineText); match !== null; match = re.exec(lineText)) {
      if (match[0].length === 0) break;
      const span: [number, number] = [match.index, match.index + match[0].length];
      first ??= span;
      if (span[1] > start) return span;
    }
    return first;
  }

  const sensitive = isCaseSensitive(query, options.caseMode);
  const haystack = sensitive ? lineText : lineText.toLocaleLowerCase();
  const needle = sensitive ? query : query.toLocaleLowerCase();
  if (haystack.startsWith(needle, start)) return [start, start + needle.length];
  const index = haystack.indexOf(needle);
  return index === -1 ? null : [index, index + needle.length];
}

// Raycast's Detail markdown also renders LaTeX — \(..\) inline, \[..\] and
// $$..$$ display — so ( ) [ must NOT be backslash-escaped: the escape itself
// would create a math delimiter and swallow the brackets. Links still cannot
// form because ] is escaped, and $ is escaped so $$ never survives.
const MARKDOWN_SPECIALS = /[`*_{}\]$#+\-.!<>|~]/g;

function escapeMarkdown(text: string): string {
  return (
    text
      // The zero-width space keeps a literal \( in the source line from
      // reassembling into the \( math delimiter after the backslash is escaped.
      .replace(/\\/g, "\\\\\u200B")
      .replace(MARKDOWN_SPECIALS, "\\$&")
  );
}

/** Length-preserving, so match spans computed on the raw line stay valid. */
function protectIndent(line: string): string {
  return line.replace(/^[ \t]+/, (match) => "\u00A0".repeat(match.length));
}

function renderLine(rawLine: string, span: [number, number] | null): string {
  const line = protectIndent(rawLine);
  if (span === null || span[0] >= span[1] || span[1] > line.length) return escapeMarkdown(line);

  const before = escapeMarkdown(line.slice(0, span[0]));
  const match = escapeMarkdown(line.slice(span[0], span[1]));
  const after = escapeMarkdown(line.slice(span[1]));
  return `${before}**${match}**${after}`;
}

/** Files rendered as styled text with the match bolded; everything else gets a code fence. */
const PROSE_EXTENSIONS = new Set(["md", "markdown", "mdx", "txt", "text"]);

const FENCE_LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  sql: "sql",
  css: "css",
  scss: "scss",
  html: "html",
  htm: "html",
  xml: "xml",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  dart: "dart",
  lua: "lua",
};

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** The fence must be longer than any backtick run in the content. */
function codeBlock(lines: string[], language: string): string {
  const longestRun = Math.max(
    2,
    ...lines.map((line) => (line.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0)),
  );
  const fence = "`".repeat(longestRun + 1);
  return `${fence}${language}\n${lines.join("\n")}\n${fence}`;
}

/**
 * Detail-pane markdown. Code and data files render as a fenced code block:
 * monospace keeps the indentation and nothing inside a fence needs escaping.
 * Bold highlighting is impossible inside a fence, so prose files (Markdown,
 * plain text) keep the styled path with the matched range bolded.
 */
export function resultDetailMarkdown(result: SearchResult, query: string, options: HighlightOptions): string {
  const contextBefore = result.contextBefore ?? [];
  const contextAfter = result.contextAfter ?? [];
  if (!PROSE_EXTENSIONS.has(fileExtension(result.fileName))) {
    const language = FENCE_LANGUAGES[fileExtension(result.fileName)] ?? "";
    return codeBlock([...contextBefore, result.lineText, ...contextAfter], language);
  }

  const span = locateMatch(result.lineText, result.column, query.trim(), options);
  const lines = [
    ...contextBefore.map((line) => renderLine(line, null)),
    renderLine(result.lineText, span),
    ...contextAfter.map((line) => renderLine(line, null)),
  ];
  return lines.map((line) => (line.length === 0 ? "\u00A0" : line)).join("  \n");
}
