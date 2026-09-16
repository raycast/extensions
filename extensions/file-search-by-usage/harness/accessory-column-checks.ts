import {
  columnWidths,
  pad,
  scoreCell,
  visitsCell,
} from "../src/lib/accessory-columns";

/**
 * The accessories on the right line up as columns.
 *
 * Raycast sizes each accessory to its content and lays them out from the
 * right, so equal width per column is the whole mechanism. These check the
 * arithmetic; the rendered accessory list is checked in row-render-checks.
 */
export function accessoryColumnChecks(
  assert: (ok: boolean, label: string) => void,
) {
  console.log("\n=== accessory columns ===");

  const FIGURE_SPACE = "\u2007";
  const EDGE = "\u200B";
  const visible = (cell: string) => cell.replaceAll(EDGE, "");
  const width = (cell: string) => visible(cell).length;

  // The screenshot's folder: most rows have no open count, one has 1×.
  const rows = [
    { visits: 1, score: 305, time: "29d ago" },
    { visits: undefined, score: 147, time: "21h ago" },
    { visits: 1, score: 146, time: "6d ago" },
    { visits: undefined, score: 131, time: "22d ago" },
    { visits: undefined, score: 92, time: "4mo ago" },
    { visits: undefined, score: 51, time: "8mo ago" },
  ];
  const widths = columnWidths(rows);
  assert(
    widths.visits === 2 && widths.score === 3 && widths.time === 7,
    `each column is as wide as its widest cell (${widths.visits}/${widths.score}/${widths.time})`,
  );

  const cells = rows.map((row) => [
    pad(visitsCell(row.visits), widths.visits),
    pad(scoreCell(row.score), widths.score),
    pad(row.time, widths.time),
  ]);
  assert(
    cells.every(
      (row) =>
        width(row[0]) === widths.visits &&
        width(row[1]) === widths.score &&
        width(row[2]) === widths.time,
    ),
    "every cell of every row is exactly its column's width",
  );
  assert(
    cells.every((row) => row.length === cells[0].length),
    "and every row carries the same number of cells",
  );

  // A row with no open count still occupies the column.
  const empty = cells[1][0];
  assert(
    visible(empty) === FIGURE_SPACE.repeat(2) && width(empty) === 2,
    `a row that was never opened holds its column open (${JSON.stringify(empty)})`,
  );
  assert(
    visitsCell(undefined) === "" && visitsCell(0) === "",
    "an absent or zero open count reads as nothing rather than as 0×",
  );

  /*
   * The padding is never at either end of the string. A renderer that trims
   * its labels would otherwise discard it and leave the columns ragged.
   */
  assert(
    cells.every(
      (row) => !row.some((cell) => cell !== cell.trim().padEnd(cell.length)),
    ) && cells.every((row) => row.every((cell) => cell.trim() === cell)),
    "no padded cell begins or ends with whitespace",
  );
  assert(
    pad("", 3).trim() === pad("", 3) && width(pad("", 3)) === 3,
    "including a cell that is nothing but padding",
  );

  // Wider than its column, which happens between two publications.
  assert(
    width(pad("1234", 2)) === 4,
    "a cell wider than its column is not truncated",
  );
  assert(width(pad("x", 0)) === 1, "a zero-width column pads nothing");

  const none = columnWidths([]);
  assert(
    none.visits === 0 && none.score === 0 && none.time === 0,
    "an empty list has no columns to measure",
  );

  assert(
    columnWidths([{ visits: 12, score: undefined, time: "now" }]).score === 0,
    "hiding the score leaves its column with no width",
  );
  assert(
    scoreCell(304.6) === "305" && scoreCell(undefined) === "",
    "the score is rounded to a whole number, and absent when hidden",
  );
  assert(
    visitsCell(12) === "12×",
    "the open count uses the multiplication sign",
  );
}
