// src/lib/regex.ts

/** Single blockquote frame at line start: optional 0-3 spaces, `>`, optional single space. */
export const BLOCKQUOTE_PEEL = /^ {0,3}> ?/;

/** Fenced code-block opener/closer: backtick or tilde, length ≥ 3. */
export const FENCE_BOUNDARY = /^ {0,3}(`{3,}|~{3,})/;

/** Indented code: 4+ leading spaces with a non-space body. Empty whitespace-only lines do not match. */
export const INDENTED_CODE = /^ {4,}\S/;

/** ATX heading: 1-6 `#` followed by whitespace or EOL. */
export const HEADING_ATX = /^ {0,3}#{1,6}(\s|$)/;

/** Setext underline (= for h1, - for h2). Caller must verify the prior line is non-empty prose. */
export const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)\s*$/;

/** Horizontal rule: 3+ of the same char (- * _), optional internal spaces. */
export const HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;

/**
 * List-item start. Captures:
 *   group 1: leading indent
 *   group 2: marker (`-` `*` `+` or `\d{1,9}[.)]` per CommonMark 9-digit cap)
 *   group 3: trailing whitespace (defines hang indent column)
 */
export const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)/;

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

/** Hard break: trailing backslash. Caller is responsible for distinguishing escaped literal backslashes (e.g. `foo\\` in source ending with two backslashes) from a true hard-break marker. */
export const HARD_BREAK_BACKSLASH = /\\$/;

/**
 * Soft hyphen at end of a prose line — a run of lowercase letters immediately
 * before the trailing hyphen, with the run NOT preceded by another letter or
 * a hyphen. Excludes:
 *   - hyphens after capital-led words (e.g. "State-")
 *   - mid-compound breaks (e.g. "state-of-the-")
 *   - hyphens after digits (e.g. "123-")
 * Note: NOT \w, because \w includes digits which we don't want.
 */
export const HYPHEN_BREAK_END = /(?:^|[^A-Za-z-])[a-z]+-$/;
