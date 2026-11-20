import { createHash } from "node:crypto";

export const MAX_RENDERABLE_PIECES = 2_000_000;

export interface ChunkGrid {
  columns: number;
  rows: number;
  fractions: number[][];
  piecesPerCell: number;
  totalPieces: number;
}

export function normalizeBitfield(bitfield: string | undefined): string | null {
  if (!bitfield) return null;
  const normalized = bitfield.trim().replace(/^0x/i, "").toLowerCase();
  if (!normalized || !/^[0-9a-f]+$/.test(normalized)) return null;
  return normalized;
}

function isBitSet(bitfield: string, index: number): boolean {
  const nibbleIndex = Math.floor(index / 4);
  if (nibbleIndex >= bitfield.length) return false;
  const nibble = Number.parseInt(bitfield[nibbleIndex], 16);
  const bitInNibble = 3 - (index % 4);
  return Number.isFinite(nibble) && (nibble & (1 << bitInNibble)) !== 0;
}

function countBitsInRange(
  bitfield: string,
  start: number,
  end: number,
): number {
  let count = 0;
  for (let index = start; index < end; index += 1) {
    if (isBitSet(bitfield, index)) count += 1;
  }
  return count;
}

export function aggregateBitfield(
  bitfield: string | undefined,
  numPieces: number,
  maxColumns: number,
  maxRows: number,
): ChunkGrid | null {
  const normalized = normalizeBitfield(bitfield);
  if (!normalized || !Number.isFinite(numPieces) || numPieces <= 0) return null;
  if (numPieces > MAX_RENDERABLE_PIECES) return null;

  const columns = Math.max(1, Math.floor(maxColumns));
  const rows = Math.max(1, Math.min(maxRows, Math.ceil(numPieces / columns)));
  const totalCells = columns * rows;
  const piecesPerCell = Math.max(1, Math.ceil(numPieces / totalCells));
  const fractions: number[][] = [];

  for (let row = 0; row < rows; row += 1) {
    const line: number[] = [];
    for (let column = 0; column < columns; column += 1) {
      const cellIndex = row * columns + column;
      const start = cellIndex * piecesPerCell;
      const end = Math.min(numPieces, start + piecesPerCell);
      if (start >= numPieces || end <= start) {
        line.push(0);
        continue;
      }
      const completed = countBitsInRange(normalized, start, end);
      line.push(completed / (end - start));
    }
    fractions.push(line);
  }

  return { columns, rows, fractions, piecesPerCell, totalPieces: numPieces };
}

export function hashBitfield(
  bitfield: string | undefined,
  grid: ChunkGrid,
): string {
  const hash = createHash("sha1");
  hash.update(bitfield ?? "empty");
  hash.update(`|${grid.columns}x${grid.rows}|${grid.piecesPerCell}`);
  for (const row of grid.fractions) {
    hash.update(
      row.map((value) => Math.round(value * 255).toString(16)).join(","),
    );
    hash.update(";");
  }
  return hash.digest("hex").slice(0, 12);
}

export function getProgressFromBitfield(
  bitfield: string | undefined,
  numPieces: number,
): number | null {
  const normalized = normalizeBitfield(bitfield);
  if (!normalized || numPieces <= 0) return null;
  let completed = 0;
  for (let index = 0; index < numPieces; index += 1) {
    if (isBitSet(normalized, index)) completed += 1;
  }
  return completed / numPieces;
}
