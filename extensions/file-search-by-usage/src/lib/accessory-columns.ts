/**
 * Fixed-width columns for the accessories on the right of a result row.
 *
 * Raycast lays accessories out from the right and sizes each one to its
 * content, and `List.Item.Accessory` has no width or alignment field. So a row
 * whose value is missing, or merely shorter, shifts every column to its left:
 * a row with no open count put its score and date where another row had its
 * date alone. Lining the columns up means giving every row the same cells at
 * the same width.
 *
 * Padding uses FIGURE SPACE, which is one digit wide, so a padded number takes
 * exactly the width of the widest number in its column. The relative date
 * still varies by less than a digit, because "4mo" and "6d" differ in the
 * widths of their letters and no space can express that.
 */

/** One digit wide, unlike a normal space. */
const FIGURE_SPACE = "\u2007";

/**
 * Zero width, and not whitespace, so the padding is never leading or trailing.
 * A renderer that trims its labels would otherwise throw the padding away and
 * leave the columns exactly as ragged as they were.
 */
const EDGE = "\u200B";

export type ColumnWidths = { visits: number; score: number; time: number };

/** How many times the item was opened, or nothing if it never was. */
export function visitsCell(count: number | undefined): string {
  return count === undefined || count <= 0 ? "" : `${count}×`;
}

/** The usage score, or nothing when the score preference is off. */
export function scoreCell(total: number | undefined): string {
  return total === undefined ? "" : total.toFixed(0);
}

/** The widest cell in each column, measured over the rows that will render. */
export function columnWidths(
  rows: { visits?: number; score?: number; time: string }[],
): ColumnWidths {
  const widest = (of: (row: (typeof rows)[number]) => string) =>
    rows.reduce((width, row) => Math.max(width, of(row).length), 0);
  return {
    visits: widest((row) => visitsCell(row.visits)),
    score: widest((row) => scoreCell(row.score)),
    time: widest((row) => row.time),
  };
}

/** Right-aligns a cell within its column. */
export function pad(text: string, width: number): string {
  return (
    EDGE + FIGURE_SPACE.repeat(Math.max(0, width - text.length)) + text + EDGE
  );
}
