import { bfsDistances } from "../src/maze/rules";
import { ptKey, type Cell, type LevelState, type Maze, type Point } from "../src/maze/types";

/** A maze with every interior wall open (border walls closed). */
export function openMaze(cols: number, rows: number): Maze {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({
      top: y === 0,
      bottom: y === rows - 1,
      left: x === 0,
      right: x === cols - 1,
    })),
  );
}

/** Close a wall on both sides of the shared edge. */
export function closeWall(maze: Maze, x: number, y: number, wall: keyof Cell): void {
  maze[y][x][wall] = true;
  if (wall === "right") maze[y][x + 1].left = true;
  if (wall === "left") maze[y][x - 1].right = true;
  if (wall === "bottom") maze[y + 1][x].top = true;
  if (wall === "top") maze[y - 1][x].bottom = true;
}

export function p(x: number, y: number): Point {
  return { x, y };
}

/** Border walls closed and every shared edge agrees on both sides. */
export function mazeIsWellFormed(maze: Maze): boolean {
  const rows = maze.length;
  const cols = maze[0].length;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = maze[y][x];
      if (y === 0 && !c.top) return false;
      if (y === rows - 1 && !c.bottom) return false;
      if (x === 0 && !c.left) return false;
      if (x === cols - 1 && !c.right) return false;
      if (x < cols - 1 && c.right !== maze[y][x + 1].left) return false;
      if (y < rows - 1 && c.bottom !== maze[y + 1][x].top) return false;
    }
  }
  return true;
}

export function reachable(maze: Maze, from: Point, to: Point, blocked?: Point): boolean {
  return bfsDistances(maze, from, blocked)[to.y][to.x] !== Infinity;
}

/** Every item on the board (key, candle, gems, portals). */
export function placedItems(state: LevelState): Point[] {
  return [state.key, state.candle, ...state.gems, ...(state.portals ?? [])].filter((x): x is Point => x !== null);
}

export function keysOf(points: Point[]): Set<string> {
  return new Set(points.map(ptKey));
}
