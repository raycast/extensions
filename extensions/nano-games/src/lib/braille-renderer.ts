import { GRID_WIDTH } from "./constants";
import type { CellType } from "./types";

function bitAt(grid: (CellType | null)[], x: number, y: number): number {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= 4) return 0;
  return grid[x + y * GRID_WIDTH] ? 1 : 0;
}

export function gridToBraille(grid: (CellType | null)[]): string {
  let str = "";
  for (let x = 0; x < GRID_WIDTH; x += 2) {
    const n =
      (bitAt(grid, x, 0) << 0) |
      (bitAt(grid, x, 1) << 1) |
      (bitAt(grid, x, 2) << 2) |
      (bitAt(grid, x + 1, 0) << 3) |
      (bitAt(grid, x + 1, 1) << 4) |
      (bitAt(grid, x + 1, 2) << 5) |
      (bitAt(grid, x, 3) << 6) |
      (bitAt(grid, x + 1, 3) << 7);
    str += String.fromCharCode(0x2800 + n);
  }
  return str;
}
