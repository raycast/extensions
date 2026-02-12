export type Point = { x: number; y: number };

export enum CellType {
  Snake = 1,
  Food = 2,
}

export interface GameState {
  grid: (CellType | null)[];
  snake: Point[];
  currentDirection: Point;
  moveQueue: Point[];
  hasMoved: boolean;
  score: number;
}
