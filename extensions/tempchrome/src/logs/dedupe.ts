import type { LogRow, StructuredLine } from "./parser";
import { rowComparableText } from "./parser";

export type BufferedRow = {
  id: string;
  row: LogRow;
  receivedAt: number;
};

export type DisplayRow = {
  id: string;
  row: LogRow;
  count: number;
  firstTime: string | null;
  lastTime: string | null;
  firstReceivedAt: number;
  lastReceivedAt: number;
};

function timeOf(row: LogRow): string | null {
  return row.type === "structured" ? (row as StructuredLine).time : null;
}

export function collapseConsecutive(rows: BufferedRow[]): DisplayRow[] {
  const display: DisplayRow[] = [];
  for (const buffered of rows) {
    const last = display.length > 0 ? display[display.length - 1] : null;
    const currentText = rowComparableText(buffered.row);
    if (last && last.row.type === buffered.row.type && rowComparableText(last.row) === currentText) {
      last.count += 1;
      last.lastTime = timeOf(buffered.row) ?? last.lastTime;
      last.lastReceivedAt = buffered.receivedAt;
      continue;
    }
    display.push({
      id: buffered.id,
      row: buffered.row,
      count: 1,
      firstTime: timeOf(buffered.row),
      lastTime: timeOf(buffered.row),
      firstReceivedAt: buffered.receivedAt,
      lastReceivedAt: buffered.receivedAt,
    });
  }
  return display;
}

export function expandWithoutDedupe(rows: BufferedRow[]): DisplayRow[] {
  return rows.map((buffered) => ({
    id: buffered.id,
    row: buffered.row,
    count: 1,
    firstTime: timeOf(buffered.row),
    lastTime: timeOf(buffered.row),
    firstReceivedAt: buffered.receivedAt,
    lastReceivedAt: buffered.receivedAt,
  }));
}
