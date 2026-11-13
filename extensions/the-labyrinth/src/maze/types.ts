export type Cell = { top: boolean; right: boolean; bottom: boolean; left: boolean };
export type Maze = Cell[][];
export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type Pickup = { kind: "gem" | "key" | "candle"; at: Point };

export const DIRECTIONS: Record<Direction, { dx: number; dy: number; wall: keyof Cell }> = {
  up: { dx: 0, dy: -1, wall: "top" },
  down: { dx: 0, dy: 1, wall: "bottom" },
  left: { dx: -1, dy: 0, wall: "left" },
  right: { dx: 1, dy: 0, wall: "right" },
};

export type Footprints = "permanent" | "fading" | "none";

export type CustomSetup = {
  level: number;
  key: boolean;
  ghost: boolean;
  portals: boolean;
  fog: boolean;
  ice: boolean;
  shifting: boolean;
  footprints: Footprints;
};

export type LevelState = {
  level: number;
  maze: Maze;
  start: Point;
  player: Point;
  exit: Point;
  needsKey: boolean;
  key: Point | null;
  hasKey: boolean;
  gems: Point[];
  gemTotal: number;
  guard: Point | null;
  guardHome: Point | null;
  guardChase: number;
  portals: [Point, Point] | null;
  fogRadius: number | null;
  candle: Point | null;
  lit: boolean;
  lightBurst: number;
  lightOrigin: Point | null;
  ice: boolean;
  /** True when ice was requested but no solvable icy layout was found, so the floor is not icy. */
  iceFallback: boolean;
  shifting: boolean;
  /** Cell key → move index it was last stepped on. */
  trail: Map<string, number>;
  /** Moves a footprint stays visible; null = forever, 0 = no footprints. */
  trailLife: number | null;
  moves: number;
  levelPoints: number;
  catches: number;
  startedAt: number;
  finishedAt: number | null;
};

export function ptKey(p: Point): string {
  return `${p.x},${p.y}`;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}
