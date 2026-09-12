// src/lib/regex.ts

/** Single blockquote frame at line start: optional 0-3 spaces, `>`, optional single space. */
export const BLOCKQUOTE_PEEL = /^ {0,3}> ?/;

/** Fenced code-block opener: backtick or tilde, length ≥ 3, optional info string. */
export const FENCE_BOUNDARY = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Fenced code-block CLOSER: the fence run may be followed only by trailing
 * whitespace (CommonMark §4.5). A line like ```` ```not-a-closer ```` is an info
 * string, not a closer — treating it as one would end the block early and expose
 * its code to reflow.
 */
export const FENCE_CLOSER = /^ {0,3}(`{3,}|~{3,})\s*$/;

/**
 * Indented code: an indent worth 4+ columns with a non-space body, where a TAB
 * advances to the next 4-column stop (CommonMark §2.2). So a single leading tab
 * qualifies, as does `"  \t"` (2 spaces + tab → column 4) and any run of tabs.
 * Empty whitespace-only lines do not match.
 *
 * Column width is computed by `indentColumns` rather than matched by a regex —
 * enumerating tab/space combinations missed cases (`"\t\t"` was treated as prose
 * and its code reflowed).
 */
export const INDENT_RUN = /^[ \t]+(?=\S)/;

/** Expanded display width of an indent run, with tabs advancing to 4-column stops. */
export function indentColumns(indent: string): number {
  let col = 0;
  for (const ch of indent) {
    if (ch === "\t") col += 4 - (col % 4);
    else col++;
  }
  return col;
}

/** True when a line's leading whitespace reaches column 4+ (i.e. it is indented code). */
export function isIndentedCode(content: string): boolean {
  const m = content.match(INDENT_RUN);
  return m !== null && indentColumns(m[0]) >= 4;
}

/** ATX heading: 1-6 `#` followed by whitespace or EOL. */
export const HEADING_ATX = /^ {0,3}#{1,6}(\s|$)/;

/** Setext underline (= for h1, - for h2). Caller must verify the prior line is non-empty prose. */
export const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)\s*$/;

/** Horizontal rule: 3+ of the same char (- * _), optional internal spaces. */
export const HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;

/**
 * List-item start. Captures:
 *   group 1: leading indent
 *   group 2: marker — CommonMark `-` `*` `+` / `\d{1,9}[.)]` (9-digit cap),
 *            plus common Unicode bullets pasted from rich text or terminals
 *            (•, ‣, ▪, ▸, –, —). The Unicode set is recognized so pasted
 *            content can be reflowed and (optionally) re-indented; it is
 *            emitted back verbatim, never rewritten to an ASCII marker.
 *   group 3: trailing whitespace (defines hang indent column)
 */
export const LIST_ITEM = /^(\s*)([-*+]|[•‣▪▸–—]|\d{1,9}[.)])(\s+)/;

/** Task-item marker, applied to list-item content (after stripping the list marker). */
export const TASK_MARKER = /^\[[ xX]\]\s/;

/** Reference-style link or footnote definition. */
export const LINK_REF_DEF = /^ {0,3}\[[^\]]+\]:\s+\S/;

/**
 * Pipe-table separator row. Used to confirm an adjacent pipe-bearing line is a table row.
 * Examples that match: `| --- |`, `|:--|--:|`, `--- | ---`.
 */
export const TABLE_SEPARATOR = /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

/** Hard break: 2+ trailing spaces. Apply BEFORE any trim. */
export const HARD_BREAK_SPACES = / {2,}$/;

/**
 * Hard break: a trailing backslash that is NOT itself escaped. Only an ODD
 * number of trailing backslashes is a hard break — an even run is a sequence of
 * escaped literal backslashes (`foo\\` renders as `foo\` with no line break).
 * The leading `[^\\]|^` anchors the count so parity is measured over the whole run.
 */
export const HARD_BREAK_BACKSLASH = /(?:^|[^\\])(?:\\\\)*\\$/;

/** U+00AD SOFT HYPHEN at end of a line — an unambiguous soft line-break marker. */
export const SOFT_HYPHEN_END = /­$/;

/**
 * A line-break hyphen that binds two halves of one word: an ASCII `-` or a
 * U+00AD soft hyphen at end of line, preceded by a letter.
 *
 * `\p{L}` (Unicode letter) rather than `[A-Za-z]` so accented Latin, Cyrillic,
 * Greek, and CJK all qualify — an ASCII-only class silently failed to rejoin
 * `Bindestrich-/Wörter`.
 */
export const HYPHEN_BREAK_END = /[\p{L}\p{Nd}][-­]$/u;

/** A Unicode letter at the start of the next line — the other half of a broken word. */
export const STARTS_WITH_LETTER = /^\p{L}/u;

/** A digit at the start of the next line (numeric ranges: `5-` + `10`). */
export const STARTS_WITH_DIGIT = /^\p{Nd}/u;
