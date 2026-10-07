import { BOX, BoxStyle } from "./box";
import { alignRows, measureColumns } from "./columns";
import { splitLines } from "./width";

export type TableStyle = BoxStyle | "markdown" | "plain";

const MD_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/**
 * Splits rows into cells. Delimiter, in order of preference: tab (pasted from a spreadsheet),
 * pipe (a markdown table), two or more spaces (aligned columns), comma. Cells of a markdown table
 * stay as markdown source (`\|`, `\*`), so Table · markdown can keep them exactly as written.
 */
function readTable(input: string): { rows: string[][]; markdown: boolean } {
  const lines = splitLines(input).filter((l) => l.trim() && !MD_SEPARATOR.test(l));
  if (!lines.length) return { rows: [], markdown: false };

  // Separators inside "quoted" CSV cells don't decide the delimiter.
  const bare = lines.map((l) => l.replace(/"[^"]*"/g, '""'));
  let split: (l: string) => string[];
  if (bare.some((l) => l.includes("\t"))) {
    split = (l) => l.split("\t");
  } else if (bare.every((l) => l.includes("|"))) {
    split = splitMarkdownRow;
  } else if (bare.some((l) => /\S {2,}\S/.test(l))) {
    split = (l) => l.trim().split(/ {2,}/);
  } else if (bare.every((l) => l.includes(","))) {
    split = splitCsv;
  } else {
    split = (l) => [l];
  }

  const rows = lines.map((l) => split(l).map((c) => c.trim()));
  const cols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  return {
    rows: rows.map((r) => [...r, ...Array(cols - r.length).fill("")]),
    markdown: split === splitMarkdownRow,
  };
}

/** Rows of cells, as the text people see: markdown escapes are resolved (`\|` → `|`). */
export function parseTable(input: string): string[][] {
  const { rows, markdown } = readTable(input);
  return markdown ? rows.map((r) => r.map(unescapeMarkdown)) : rows;
}

// CommonMark: a backslash before ASCII punctuation escapes it; before anything else it's literal.
const PUNCT = /[!-/:-@[-`{-~]/;

/**
 * A code span opening at `start` (a run of n backticks, closed by the next run of exactly n):
 * where it ends, or -1 if it isn't closed. Inside a code span backslashes are literal.
 */
function codeSpanEnd(text: string, start: number): number {
  const run = (at: number) => {
    let end = at;
    while (text[end] === "`") end++;
    return end - at;
  };
  const n = run(start);
  for (let i = start + n; i < text.length;) {
    if (text[i] !== "`") {
      i++;
      continue;
    }
    const m = run(i);
    if (m === n) return i + m;
    i += m;
  }
  return -1;
}

/**
 * Walks a cell, handing code spans to `code` and everything else, one character at a time, to
 * `text`, which returns what to emit and how many characters it used.
 */
function mapCell(cell: string, text: (i: number) => [string, number], code: (span: string) => string): string {
  let out = "";
  for (let i = 0; i < cell.length;) {
    if (cell[i] === "`") {
      const end = codeSpanEnd(cell, i);
      let run = 0;
      while (cell[i + run] === "`") run++;
      out += end > 0 ? code(cell.slice(i, end)) : cell.slice(i, i + run);
      i = end > 0 ? end : i + run;
      continue;
    }
    const [emit, used] = text(i);
    out += emit;
    i += used;
  }
  return out;
}

/** Markdown source → the text people see. In a code span only `\|` is an escape (GitHub tables). */
function unescapeMarkdown(cell: string): string {
  return mapCell(
    cell,
    (i) => (cell[i] === "\\" && PUNCT.test(cell[i + 1] ?? "") ? [cell[i + 1], 2] : [cell[i], 1]),
    (span) => span.replace(/\\\|/g, "|"),
  );
}

/**
 * The inverse, for text going into a markdown cell: escape a backslash that would otherwise escape
 * the next character, and escape pipes, which would start a new column. `\\server` → `\\\server`,
 * `C:\|tail` → `C:\\\|tail`, and `C:\path` stays as it is. In a code span only pipes are escaped.
 */
function escapeMarkdownCell(cell: string): string {
  return mapCell(
    cell,
    (i) => {
      if (cell[i] === "|") return ["\\|", 1];
      if (cell[i] === "\\" && PUNCT.test(cell[i + 1] ?? "")) return ["\\\\", 1];
      return [cell[i], 1];
    },
    (span) => span.replace(/\|/g, "\\|"),
  );
}

/**
 * One markdown table row, split the way GitHub does: `\` escapes the next character, so `\|` is a
 * literal pipe and `\\|` is a backslash, then a cell break. Cells keep their escapes as written.
 */
function splitMarkdownRow(line: string): string[] {
  const text = line.trim();
  const cells: string[] = [];
  let cell = "";
  let endsWithBreak = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    endsWithBreak = false;
    if (ch === "\\" && i + 1 < text.length) {
      cell += ch + text[i + 1];
      i++;
    } else if (ch === "|") {
      cells.push(cell);
      cell = "";
      endsWithBreak = true;
    } else cell += ch;
  }
  cells.push(cell);
  // The outer pipes are optional and don't make cells of their own.
  if (text.startsWith("|")) cells.shift();
  if (endsWithBreak && cells.length > 1) cells.pop();
  return cells;
}

/** One CSV line: a quoted cell keeps its commas, and `""` inside quotes is a literal quote. */
function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && !cell.trim()) {
      quoted = true;
      cell = "";
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells;
}

/** First row is the header. Columns whose body cells are all numbers are right-aligned. */
export function renderTable(input: string, style: TableStyle = "light"): string {
  let rows: string[][];
  if (style === "markdown") {
    // A markdown table is only realigned; other input is escaped so GitHub shows it as written.
    const read = readTable(input);
    rows = read.markdown ? read.rows : read.rows.map((r) => r.map(escapeMarkdownCell));
  } else rows = parseTable(input);
  if (!rows.length) return "";
  const { widths, numeric, cell } = measureColumns(rows, 3);
  const body = rows.slice(1);

  if (style === "plain") {
    const [header, ...rest] = alignRows(rows);
    return [header, widths.map((w) => "─".repeat(w)).join("  "), ...rest].join("\n");
  }

  if (style === "markdown") {
    const line = (r: string[]) => `| ${r.map(cell).join(" | ")} |`;
    const sep = widths.map((w, i) => (numeric[i] ? "-".repeat(w - 1) + ":" : "-".repeat(w)));
    return [line(rows[0]), `| ${sep.join(" | ")} |`, ...body.map(line)].join("\n");
  }

  const c = BOX[style];
  const rule = (l: string, j: string, r: string) => l + widths.map((w) => c.h.repeat(w + 2)).join(j) + r;
  const line = (r: string[]) => `${c.v} ${r.map(cell).join(` ${c.v} `)} ${c.v}`;
  const out = [rule(c.tl, c.tj, c.tr), line(rows[0])];
  if (body.length) out.push(rule(c.ml, c.x, c.mr), ...body.map(line));
  out.push(rule(c.bl, c.bj, c.br));
  return out.join("\n");
}
