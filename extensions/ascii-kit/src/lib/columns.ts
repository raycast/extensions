import { displayWidth, padEnd, padStart } from "./width";

const NUMERIC = /^[-+]?[$€£]?\d[\d,. ]*%?$/;

export interface Columns {
  widths: number[];
  /** Columns whose body cells (every row after the first) are all numbers: right-aligned. */
  numeric: boolean[];
  cell: (text: string, col: number) => string;
}

/** Column widths by display width, so emoji and CJK cells line up too. */
export function measureColumns(rows: string[][], minWidth = 1, leftColumns = 0): Columns {
  const cols = Math.max(0, ...rows.map((r) => r.length));
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(minWidth, ...rows.map((r) => displayWidth(r[i] ?? ""))),
  );
  const body = rows.slice(1);
  const numeric = widths.map(
    (_, i) => i >= leftColumns && body.length > 0 && body.every((r) => !r[i] || NUMERIC.test(r[i])),
  );
  const cell = (text: string, i: number) => (numeric[i] ? padStart : padEnd)(text, widths[i]);
  return { widths, numeric, cell };
}

/**
 * Rows as lines of padded cells separated by `gutter`, like elastic tab stops. The first
 * `leftColumns` columns are never right-aligned (a tree column must stay flush left).
 */
export function alignRows(rows: string[][], gutter = "  ", leftColumns = 0): string[] {
  const { widths, cell } = measureColumns(rows, 1, leftColumns);
  return rows.map((r) =>
    widths
      .map((_, i) => cell(r[i] ?? "", i))
      .join(gutter)
      .trimEnd(),
  );
}
