import { stripVTControlCharacters } from "node:util";

// ─── Regexes ──────────────────────────────────────────────────────────────────

// Unicode box-drawing block: U+2500–U+257F
const BOX_DRAWING_RE = /[\u2500-\u257F]/g;

// Spinner / progress characters (Braille + common spinner frames)
const SPINNER_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⠁⠂⠄⡀⢀⠠⠐⠈]/g;

// Lines that are purely decorative separators: only repeated ─ ═ - = ~ * # chars (3+)
const SEPARATOR_LINE_RE = /^[\s\-=~*#─═━]+$/;

// Sentence-ending punctuation that signals a line should NOT be joined forward
const SENTENCE_END_RE = /[.?!:]$/;

// List-marker at the start of a line that should NOT be joined onto a previous line
const LIST_MARKER_RE = /^(\s*[-*>]|\s*\d+\.)\s/;

// Leading/trailing pipe borders (│ and | with optional spaces)
const LEADING_PIPE_RE = /^\s*[│|]\s*/;
const TRAILING_PIPE_RE = /[\s│|]+$/;

// Indented non-list line (signals a code block that should not be joined)
const INDENTED_LINE_RE = /^\s/;

// Fenced code block delimiter (``` with optional language tag)
const FENCE_RE = /^```/;

// Matches rows with 2+ columns — single-column rows (| content |) are ambiguous with terminal
// borders and intentionally not matched. Unicode │ is stripped by BOX_DRAWING_RE before this
// check runs, so only ASCII | remains.
const TABLE_ROW_RE = /^\s*\|(?:[^|]*\|){2,}\s*$/;

// ─── Types ────────────────────────────────────────────────────────────────────

export type LineKind = "table-row" | "text";

export interface TaggedLine {
  content: string;
  kind: LineKind;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function dedent(text: string): string {
  const lines = text.split("\n");
  let minIndent = Infinity;

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const indent = (line.match(/^( *)/) ?? ["", ""])[1].length;

    if (indent < minIndent) {
      minIndent = indent;
    }

    if (minIndent === 0) {
      break;
    }
  }

  if (!Number.isFinite(minIndent) || minIndent === 0) {
    return text;
  }

  return lines.map((l) => l.slice(minIndent)).join("\n");
}

// ─── Pipeline steps ───────────────────────────────────────────────────────────

/** Strip ANSI/VT control sequences, box-drawing characters, and spinner glyphs. */
export function stripArtifacts(text: string): string {
  return stripVTControlCharacters(text).replace(BOX_DRAWING_RE, "").replace(SPINNER_RE, "");
}

/** Remove the minimum shared indent from each paragraph independently. */
export function dedentParagraphs(text: string): string {
  return text.split(/\n\n+/).map(dedent).join("\n\n");
}

/**
 * Classify each line as a table row or regular text, stripping pipe borders and dropping
 * pure separator lines. Must run after stripArtifacts so box-drawing │ chars are already
 * gone and TABLE_ROW_RE only needs to match ASCII |.
 */
export function classifyLines(lines: string[]): TaggedLine[] {
  const result: TaggedLine[] = [];

  for (const rawLine of lines) {
    if (TABLE_ROW_RE.test(rawLine)) {
      result.push({ content: rawLine, kind: "table-row" });
      continue;
    }

    const stripped = rawLine.replace(LEADING_PIPE_RE, "").replace(TRAILING_PIPE_RE, "");

    if (SEPARATOR_LINE_RE.test(stripped)) {
      continue;
    }

    result.push({ content: stripped, kind: "text" });
  }

  return result;
}

/**
 * Rejoin lines that were soft-wrapped at a fixed column width. Respects sentence
 * boundaries, list markers, fenced code blocks, indented code, and table rows.
 */
export function joinWrappedLines(lines: TaggedLine[]): string[] {
  const result: string[] = [];
  // Copy so the input is not mutated when we promote merged content forward.
  const copy = lines.slice();
  let inFence = false;

  for (let i = 0; i < copy.length; i++) {
    const { content: current, kind } = copy[i];
    const next = copy[i + 1];

    const isFenceDelimiter = FENCE_RE.test(current);
    if (isFenceDelimiter) inFence = !inFence;

    const isTableRow = kind === "table-row";
    const isNextTableRow = next?.kind === "table-row";
    const isNextEmpty = next === undefined || next.content === "";
    const isIndentedCode = !isFenceDelimiter && INDENTED_LINE_RE.test(current) && !LIST_MARKER_RE.test(current);
    const isClauseEnd = SENTENCE_END_RE.test(current);
    const hasCliFlags = current.includes(" -- ");
    const isNextListItem = next !== undefined && LIST_MARKER_RE.test(next.content);

    const canJoin =
      current !== "" &&
      !inFence &&
      !isFenceDelimiter &&
      !isIndentedCode &&
      !isTableRow &&
      !isClauseEnd &&
      !hasCliFlags &&
      !isNextEmpty &&
      !isNextTableRow &&
      !isNextListItem;

    if (canJoin && next !== undefined) {
      copy[i + 1] = {
        content: `${current} ${next.content.trimStart()}`,
        kind: next.kind,
      };
    } else {
      result.push(current);
    }
  }

  return result;
}

/**
 * Trim each line, collapse 3+ consecutive blank lines to 2, and strip
 * leading/trailing whitespace from the full text.
 */
export function normalizeSpacing(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function cleanText(input: string): string {
  if (!input.trim()) {
    return input;
  }

  const text = dedentParagraphs(stripArtifacts(input));
  const tagged = classifyLines(text.split("\n"));
  const joined = joinWrappedLines(tagged);
  return normalizeSpacing(joined.join("\n"));
}

export interface CleanResult {
  changed: boolean;
  cleaned: string;
  cleanedLineCount: number;
  original: string;
  originalLineCount: number;
  reductionPercent: number;
}

export function cleanWithStats(input: string): CleanResult {
  const cleaned = cleanText(input);
  const changed = cleaned !== input;
  const reductionPercent = input.length > 0 ? Math.round(((input.length - cleaned.length) / input.length) * 100) : 0;
  const originalLineCount = input.split("\n").length;
  const cleanedLineCount = cleaned.split("\n").length;

  return {
    changed,
    cleaned,
    cleanedLineCount,
    original: input,
    originalLineCount,
    reductionPercent,
  };
}
