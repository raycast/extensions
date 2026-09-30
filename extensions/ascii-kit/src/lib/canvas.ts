import { graphemeWidth, graphemes, splitLines } from "./width";

/**
 * A grid of cells for placing text at (row, column). Grows as needed. A wide grapheme takes its
 * cell plus an empty filler cell, so columns stay aligned with display width.
 */
export class Canvas {
  private rows: string[][] = [];

  private cell(row: number, col: number): void {
    while (this.rows.length <= row) this.rows.push([]);
    const r = this.rows[row];
    while (r.length <= col) r.push(" ");
  }

  put(row: number, col: number, text: string): void {
    let c = col;
    for (const g of graphemes(text)) {
      const w = graphemeWidth(g);
      this.cell(row, c + Math.max(0, w - 1));
      this.rows[row][c] = g;
      if (w === 2) this.rows[row][c + 1] = "";
      c += w;
    }
  }

  /** Places a multi-line block with its top-left corner at (row, col). */
  block(row: number, col: number, text: string): void {
    splitLines(text).forEach((line, i) => this.put(row + i, col, line));
  }

  get height(): number {
    return this.rows.length;
  }

  toString(): string {
    return this.rows.map((r) => r.join("").trimEnd()).join("\n");
  }
}

/** Replaces the character at `col` of a border row (box-drawing only, so index = column). */
export function setAt(line: string, col: number, ch: string): string {
  const chars = [...line];
  chars[col] = ch;
  return chars.join("");
}
