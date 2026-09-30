import { DOWN, LEFT, RIGHT, UP } from "./constants";
import type { Point } from "./types";

export const DIRECTIONS_BY_CHAR: Record<string, Point> = {
  // WASD
  w: UP,
  a: LEFT,
  s: DOWN,
  d: RIGHT,
  W: UP,
  A: LEFT,
  S: DOWN,
  D: RIGHT,

  // Vim (hjkl)
  h: LEFT,
  j: DOWN,
  k: UP,
  l: RIGHT,
  H: LEFT,
  J: DOWN,
  K: UP,
  L: RIGHT,
};

export function getDirectionFromChar(char: string): Point | null {
  return DIRECTIONS_BY_CHAR[char] || null;
}
