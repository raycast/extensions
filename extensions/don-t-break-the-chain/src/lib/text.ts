import { WeekRow } from "./month";
import { CellStyle } from "./preferences";

const COLUMNS = 7;
/** Interior width of one cell, in characters. */
const CELL_WIDTH = 3;

/** Box drawing character for a junction, keyed by which arms leave it. */
const JUNCTIONS = [
  " ", // ----
  "─", // ---r
  "─", // --l-
  "─", // --lr
  "│", // -d--
  "┌", // -d-r
  "┐", // -dl-
  "┬", // -dlr
  "│", // u---
  "└", // u--r
  "┘", // u-l-
  "┴", // u-lr
  "│", // ud--
  "├", // ud-r
  "┤", // udl-
  "┼", // udlr
];

const CROSS = "╳";

/**
 * Glyphs for the clickable rows inside the menu, one set per style. `blank` fills
 * a slot that belongs to no day: an em space next to the narrow ☐, an ideographic
 * space next to the double-width ⬜, so rows stay lined up either way.
 */
const GLYPHS: Record<CellStyle, { empty: string; done: string; blank: string; gap: string }> = {
  drawn: { empty: "☐", done: "☒", blank: "\u2003", gap: "\u2002\u2002" },
  emoji: { empty: "⬜", done: "✅", blank: "\u3000", gap: "\u2002" },
};

export function dayGlyph(isMarked: boolean, style: CellStyle): string {
  const glyphs = GLYPHS[style];
  return isMarked ? glyphs.done : glyphs.empty;
}

/** One week as a single line of glyphs, for a menu row title. */
export function renderWeekGlyphs(week: WeekRow, marked: Set<number>, style: CellStyle): string {
  const glyphs = GLYPHS[style];
  return week.map((day) => (day === null ? glyphs.blank : dayGlyph(marked.has(day), style))).join(glyphs.gap);
}

export function renderMonthText(weeks: WeekRow[], marked: Set<number>, style: CellStyle, letters?: string[]): string {
  return style === "emoji" ? renderEmojiMonth(weeks, marked, letters) : renderDrawnMonth(weeks, marked, letters);
}

/**
 * Draw the month as box-drawing characters. Only real days get a cell, so the
 * first and last rows come out ragged exactly like the pen-and-paper version.
 */
function renderDrawnMonth(weeks: WeekRow[], marked: Set<number>, letters?: string[]): string {
  const rows = weeks.length;
  const hasDay = (row: number, column: number) =>
    row >= 0 && row < rows && column >= 0 && column < COLUMNS && weeks[row][column] !== null;

  /** Horizontal edge on grid line `row`, spanning the cell in `column`. */
  const horizontal = (row: number, column: number) => hasDay(row - 1, column) || hasDay(row, column);
  /** Vertical edge at corner `column`, spanning the cell row `row`. */
  const vertical = (row: number, column: number) => hasDay(row, column - 1) || hasDay(row, column);

  const lines: string[] = [];

  if (letters) {
    lines.push(letters.map((letter) => ` ${letter.padStart(2).padEnd(CELL_WIDTH)}`).join(""));
  }

  for (let row = 0; row <= rows; row++) {
    let border = "";
    for (let column = 0; column <= COLUMNS; column++) {
      const up = row > 0 && vertical(row - 1, column);
      const down = row < rows && vertical(row, column);
      const left = column > 0 && horizontal(row, column - 1);
      const right = column < COLUMNS && horizontal(row, column);
      border += JUNCTIONS[(up ? 8 : 0) | (down ? 4 : 0) | (left ? 2 : 0) | (right ? 1 : 0)];
      if (column < COLUMNS) {
        border += (horizontal(row, column) ? "─" : " ").repeat(CELL_WIDTH);
      }
    }
    lines.push(border.trimEnd());

    if (row === rows) break;

    let content = "";
    for (let column = 0; column <= COLUMNS; column++) {
      content += vertical(row, column) ? "│" : " ";
      if (column < COLUMNS) {
        const day = weeks[row][column];
        content += day !== null && marked.has(day) ? ` ${CROSS} ` : " ".repeat(CELL_WIDTH);
      }
    }
    lines.push(content.trimEnd());
  }

  return lines.join("\n");
}

/** ⬜ / ✅ grid. Each glyph is two monospace columns wide, so the letters pair up with it. */
function renderEmojiMonth(weeks: WeekRow[], marked: Set<number>, letters?: string[]): string {
  const lines = letters ? [letters.map((letter) => `${letter} `).join("")] : [];

  for (const week of weeks) {
    lines.push(
      week
        .map((day) => (day === null ? GLYPHS.emoji.blank : dayGlyph(marked.has(day), "emoji")))
        .join("")
        .trimEnd(),
    );
  }

  return lines.join("\n");
}
