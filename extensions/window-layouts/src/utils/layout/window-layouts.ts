/**
 * Layout is a 2D array where each number represents a window
 * Repeated numbers indicate that window spans multiple cells
 * Example:
 * [
 *   [1, 1, 2],
 *   [3, 4, 2]
 * ]
 * This creates a layout where window 1 spans two columns in the first row,
 * window 2 spans two rows in the last column, and windows 3 and 4 take
 * one cell each in the second row.
 */

import type { Layout } from "./types";

export const GRID: Layout = [
  [1, 2],
  [3, 4],
];

export const HORIZONTAL_50_50: Layout = [[1, 2]];

export const HORIZONTAL_70_30: Layout = [[1, 1, 2]];

export const HORIZONTAL_30_70: Layout = [[1, 2, 2]];

export const HORIZONTAL_3: Layout = [[1, 2, 3]];

export const HORIZONTAL_1_2: Layout = [
  [1, 2],
  [1, 3],
];

export const HORIZONTAL_2_1: Layout = [
  [2, 1],
  [3, 1],
];

export const VERTICAL_50_50: Layout = [[1], [2]];

export const VERTICAL_70_30: Layout = [[1], [1], [2]];

export const VERTICAL_30_70: Layout = [[1], [2], [2]];

export const VERTICAL_3: Layout = [[1], [2], [3]];

export const VERTICAL_1_2: Layout = [
  [1, 1],
  [2, 3],
];

export const VERTICAL_2_1: Layout = [
  [2, 3],
  [1, 1],
];
