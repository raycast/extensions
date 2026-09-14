import { DIRECTIONS, ptKey, samePoint, type Direction, type Maze, type Point } from "./types";

export function bfsDistances(maze: Maze, from: Point, blocked?: Point): number[][] {
  const rows = maze.length;
  const cols = maze[0].length;
  const dist = Array.from({ length: rows }, () => Array<number>(cols).fill(Infinity));
  dist[from.y][from.x] = 0;
  const queue: Point[] = [from];
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    if (blocked && samePoint(p, blocked)) continue;
    for (const { dx, dy, wall } of Object.values(DIRECTIONS)) {
      if (maze[p.y][p.x][wall]) continue;
      const n = { x: p.x + dx, y: p.y + dy };
      if (dist[n.y][n.x] !== Infinity) continue;
      dist[n.y][n.x] = dist[p.y][p.x] + 1;
      queue.push(n);
    }
  }
  return dist;
}

export function stepGuard(maze: Maze, guard: Point, player: Point, chaseProbability: number): Point {
  const options = Object.values(DIRECTIONS)
    .filter((d) => !maze[guard.y][guard.x][d.wall])
    .map((d) => ({ x: guard.x + d.dx, y: guard.y + d.dy }));
  if (options.length === 0) return guard;
  if (Math.random() < chaseProbability) {
    const dist = bfsDistances(maze, player);
    const best = Math.min(...options.map((o) => dist[o.y][o.x]));
    const chasing = options.filter((o) => dist[o.y][o.x] === best);
    return chasing[Math.floor(Math.random() * chasing.length)];
  }
  return options[Math.floor(Math.random() * options.length)];
}

export function slidePath(
  maze: Maze,
  from: Point,
  direction: Direction,
  ice: boolean,
  portals: [Point, Point] | null,
  exit: Point,
  doorLocked: boolean,
): { cells: Point[]; blockedByDoor: boolean; warped: boolean } {
  const { dx, dy, wall } = DIRECTIONS[direction];
  const cells: Point[] = [];
  let cur = from;
  let blockedByDoor = false;
  let warped = false;
  for (;;) {
    if (maze[cur.y][cur.x][wall]) break;
    const step = { x: cur.x + dx, y: cur.y + dy };
    if (doorLocked && samePoint(step, exit)) {
      if (cells.length === 0) blockedByDoor = true;
      break;
    }
    cur = step;
    cells.push(cur);
    if (portals) {
      const [a, b] = portals;
      if (samePoint(cur, a) || samePoint(cur, b)) {
        cur = samePoint(cur, a) ? { ...b } : { ...a };
        cells.push(cur);
        warped = true;
        break;
      }
    }
    if (samePoint(cur, exit)) break;
    if (!ice) break;
  }
  return { cells, blockedByDoor, warped };
}

/**
 * A ghost standing anywhere along a traversal catches the player there: the
 * path is cut at the ghost's cell (inclusive). Matters for ice slides and
 * portal hops, where `cells` holds more than one step.
 */
export function cutPathAtGhost(cells: Point[], ghost: Point | null): Point[] {
  if (!ghost) return cells;
  const hit = cells.findIndex((c) => samePoint(c, ghost));
  return hit === -1 ? cells : cells.slice(0, hit + 1);
}

export function iceExplore(
  maze: Maze,
  start: Point,
  exit: Point,
  key: Point | null,
  portals: [Point, Point] | null,
): { visited: Set<string>; solvable: boolean; escapable: boolean } {
  const startKey = key === null;
  const startState = `${ptKey(start)}|${startKey}`;
  const seen = new Set([startState]);
  const queue: { p: Point; k: boolean }[] = [{ p: start, k: startKey }];
  const visited = new Set([ptKey(start)]);
  const reverse = new Map<string, string[]>();
  const addEdge = (from: string, to: string) => {
    const list = reverse.get(to);
    if (list) list.push(from);
    else reverse.set(to, [from]);
  };
  let solvable = false;
  let head = 0;
  while (head < queue.length) {
    const { p, k } = queue[head++];
    const fromState = `${ptKey(p)}|${k}`;
    for (const direction of Object.keys(DIRECTIONS) as Direction[]) {
      const slide = slidePath(maze, p, direction, true, portals, exit, !k);
      if (slide.cells.length === 0) continue;
      const k2 = k || (key !== null && slide.cells.some((c) => samePoint(c, key)));
      for (const cell of slide.cells) visited.add(ptKey(cell));
      const landing = slide.cells[slide.cells.length - 1];
      if (samePoint(landing, exit)) {
        solvable = true;
        addEdge(fromState, "__EXIT__");
        continue;
      }
      const toState = `${ptKey(landing)}|${k2}`;
      addEdge(fromState, toState);
      if (!seen.has(toState)) {
        seen.add(toState);
        queue.push({ p: landing, k: k2 });
      }
    }
  }

  const canWin = new Set(["__EXIT__"]);
  const winQueue = ["__EXIT__"];
  let winHead = 0;
  while (winHead < winQueue.length) {
    const cur = winQueue[winHead++];
    for (const prev of reverse.get(cur) ?? []) {
      if (canWin.has(prev)) continue;
      canWin.add(prev);
      winQueue.push(prev);
    }
  }
  let escapable = solvable;
  if (escapable) {
    for (const state of seen) {
      if (!canWin.has(state)) {
        escapable = false;
        break;
      }
    }
  }
  return { visited, solvable, escapable };
}

export function iceRouteOk(
  maze: Maze,
  from: Point,
  exit: Point,
  key: Point | null,
  portals: [Point, Point] | null,
  mustReach: Point[] = [],
): boolean {
  const explore = iceExplore(maze, from, exit, key, portals);
  if (!explore.solvable || !explore.escapable) return false;
  return mustReach.every((p) => samePoint(p, exit) || explore.visited.has(ptKey(p)));
}

export const SHIFT_EVERY = 10;

/**
 * Opens one random wall and tries to close another, returning the new maze or
 * `null` when no valid shift exists.
 *
 * The result is validated from the player's current cell *and* from `start`:
 * a ghost catch or an ice dead-end sends the player back to `start`, so that
 * cell must keep a route to every target too (on ice, slides are one-way, so
 * reachability from the player does not imply reachability from `start`).
 */
export function shiftWalls(
  maze: Maze,
  player: Point,
  start: Point,
  exit: Point,
  mustReach: Point[],
  ice: boolean,
  key: Point | null,
  portals: [Point, Point] | null,
): Maze | null {
  const rows = maze.length;
  const cols = maze[0].length;
  const copy = maze.map((row) => row.map((c) => ({ ...c })));
  const layoutOk = (m: Maze): boolean => {
    if (ice) {
      return (
        iceRouteOk(m, player, exit, key, portals, mustReach) && iceRouteOk(m, start, exit, key, portals, mustReach)
      );
    }
    const targets = [...mustReach, start];
    const dist = bfsDistances(m, player, exit);
    return targets.every((p) => dist[p.y][p.x] !== Infinity);
  };
  type Slot = { x: number; y: number; wall: "right" | "bottom" };
  const slots: Slot[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x < cols - 1) slots.push({ x, y, wall: "right" });
      if (y < rows - 1) slots.push({ x, y, wall: "bottom" });
    }
  }
  const setWall = (s: Slot, value: boolean) => {
    copy[s.y][s.x][s.wall] = value;
    if (s.wall === "right") copy[s.y][s.x + 1].left = value;
    else copy[s.y + 1][s.x].top = value;
  };
  const closed = slots.filter((s) => copy[s.y][s.x][s.wall]);
  const open = slots.filter((s) => !copy[s.y][s.x][s.wall]);
  if (closed.length === 0 || open.length === 0) return null;

  setWall(closed[Math.floor(Math.random() * closed.length)], false);

  const shuffled = [...open].sort(() => Math.random() - 0.5);
  for (const slot of shuffled.slice(0, 40)) {
    setWall(slot, true);
    if (layoutOk(copy)) return copy;
    setWall(slot, false);
  }
  // Only the opened wall remains. Opening never breaks plain reachability, but
  // on ice it can change where slides stop, so re-validate before accepting.
  if (ice && !layoutOk(copy)) return null;
  return copy;
}
