import { bfsDistances, iceExplore, iceRouteOk } from "./rules";
import { DIRECTIONS, ptKey, type Cell, type CustomSetup, type LevelState, type Maze, type Point } from "./types";

type Theme = {
  ghost?: boolean;
  portals?: boolean;
  fog?: boolean;
  ice?: boolean;
  shifting?: boolean;
};

function themeForLevel(level: number, custom?: CustomSetup): Theme {
  if (custom) {
    return {
      ghost: custom.ghost,
      portals: custom.portals,
      fog: custom.fog,
      ice: custom.ice,
      shifting: custom.shifting,
    };
  }
  if (level <= 2) return {};
  if (level === 3) return { ghost: true };
  if (level === 4) return { portals: true };
  if (level === 5) return { ghost: true, portals: true };
  if (level === 6) return { fog: true };
  if (level === 7) return { fog: true, ghost: true };
  if (level === 8) return { fog: true, portals: true };
  if (level === 9) return { ice: true };
  if (level === 10) return { ice: true, ghost: true };
  if (level === 11) return { shifting: true };
  if (level === 12) return { shifting: true, ghost: true };
  const combos: Theme[] = [
    { ghost: true, portals: true, fog: true },
    { ice: true, ghost: true, portals: true },
    { shifting: true, fog: true },
    { ice: true, shifting: true },
    { ghost: true, fog: true, ice: true },
    { shifting: true, ghost: true, portals: true },
    { ghost: true, portals: true, fog: true, ice: true, shifting: true },
  ];
  return combos[(level - 13) % combos.length];
}

function campaignTrailLife(level: number): number | null {
  if (level <= 4) return null;
  if (level <= 8) return 40;
  if (level <= 12) return 25;
  return 10;
}

function trailLifeForLevel(level: number, custom?: CustomSetup): number | null {
  if (!custom) return campaignTrailLife(level);
  if (custom.footprints === "none") return 0;
  if (custom.footprints === "fading") return campaignTrailLife(level) ?? 40;
  return null;
}

function configForLevel(level: number, custom?: CustomSetup) {
  const theme = themeForLevel(level, custom);
  return {
    trailLife: trailLifeForLevel(level, custom),
    cols: Math.min(6 + level * 2, 26),
    rows: Math.min(5 + level, 15),
    needsKey: custom ? custom.key : level >= 2,
    gemCount: Math.min(2 + level, 7),
    hasGuard: theme.ghost === true,
    guardChase: Math.min(0.7, 0.45 + 0.05 * Math.max(0, level - 3)),
    braid: theme.ice ? 0.7 : theme.ghost ? 0.5 : theme.shifting ? 0.3 : 0,
    hasPortals: theme.portals === true,
    fogRadius: theme.fog ? Math.max(3.5, 7 - (level - 6) * 0.25) : null,
    ice: theme.ice === true,
    shifting: theme.shifting === true,
  };
}

export type Rank = "CHAOS" | "NIGHTMARE" | "PERILOUS" | "RISING" | "ADVENTURE" | "TRAINING";

/** Hex colors used inside the SVG (which always has a dark background). */
const RANK_SVG_COLOR: Record<Rank, string> = {
  CHAOS: "#ff6b6b",
  NIGHTMARE: "#e03131",
  PERILOUS: "#ff922b",
  RISING: "#fcc419",
  ADVENTURE: "#69db7c",
  TRAINING: "#74c0fc",
};

export type Briefing = {
  mods: { emoji: string; name: string; color: string }[];
  rank: Rank;
  rankColor: string;
};

type BriefingSource = Pick<
  LevelState,
  "level" | "needsKey" | "guardHome" | "portals" | "fogRadius" | "ice" | "shifting" | "trailLife"
>;

/**
 * Describes the modifiers of a level. Derived from the built state (not the
 * level config) so it can never disagree with what is actually on the board.
 */
export function levelBriefing(state: BriefingSource): Briefing {
  const ghost = state.guardHome !== null;
  const portals = state.portals !== null;
  const fog = state.fogRadius !== null;
  const mods: Briefing["mods"] = [];
  if (state.needsKey) mods.push({ emoji: "🔑", name: "KEY", color: "#ffd43b" });
  if (ghost) mods.push({ emoji: "👻", name: "GHOST", color: "#b197fc" });
  if (portals) mods.push({ emoji: "🌀", name: "PORTALS", color: "#74c0fc" });
  if (fog) mods.push({ emoji: "🌑", name: "FOG", color: "#adb5bd" });
  if (state.ice) mods.push({ emoji: "🧊", name: "ICE", color: "#a5d8ff" });
  if (state.shifting) mods.push({ emoji: "🧱", name: "SHIFT", color: "#ffd8a8" });
  const hazards = mods.filter((m) => m.name !== "KEY").length;
  const chaos = ghost && portals && fog && state.ice && state.shifting;
  if (state.trailLife !== null) {
    mods.push({ emoji: "🐾", name: state.trailLife === 0 ? "NO TRAIL" : "FADING", color: "#f783ac" });
  }
  const rank: Rank = chaos
    ? "CHAOS"
    : hazards >= 3
      ? "NIGHTMARE"
      : hazards === 2
        ? "PERILOUS"
        : hazards === 1
          ? "RISING"
          : state.level >= 2
            ? "ADVENTURE"
            : "TRAINING";
  return { mods, rank, rankColor: RANK_SVG_COLOR[rank] };
}

const OPPOSITE: Record<keyof Cell, keyof Cell> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function generateMaze(cols: number, rows: number, braid = 0): Maze {
  const maze: Maze = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ top: true, right: true, bottom: true, left: true })),
  );
  const visited = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const stack: Point[] = [{ x: 0, y: 0 }];
  visited[0][0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = (Object.values(DIRECTIONS) as { dx: number; dy: number; wall: keyof Cell }[])
      .map((d) => ({ x: current.x + d.dx, y: current.y + d.dy, wall: d.wall }))
      .filter((n) => n.x >= 0 && n.x < cols && n.y >= 0 && n.y < rows && !visited[n.y][n.x]);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    maze[current.y][current.x][next.wall] = false;
    maze[next.y][next.x][OPPOSITE[next.wall]] = false;
    visited[next.y][next.x] = true;
    stack.push({ x: next.x, y: next.y });
  }

  if (braid > 0) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = maze[y][x];
        const wallCount = Number(cell.top) + Number(cell.right) + Number(cell.bottom) + Number(cell.left);
        if (wallCount !== 3 || Math.random() >= braid) continue;
        const closed = (Object.values(DIRECTIONS) as { dx: number; dy: number; wall: keyof Cell }[]).filter(
          (d) => cell[d.wall] && x + d.dx >= 0 && x + d.dx < cols && y + d.dy >= 0 && y + d.dy < rows,
        );
        if (closed.length === 0) continue;
        const pick = closed[Math.floor(Math.random() * closed.length)];
        cell[pick.wall] = false;
        maze[y + pick.dy][x + pick.dx][OPPOSITE[pick.wall]] = false;
      }
    }
  }

  return maze;
}

function pickCell(
  maze: Maze,
  dist: number[][],
  occupied: Set<string>,
  minDist: number,
  allowed?: Set<string> | null,
): Point | null {
  for (let threshold = minDist; threshold >= 0; threshold = Math.floor(threshold / 2) - 1) {
    const candidates: Point[] = [];
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[0].length; x++) {
        if (occupied.has(`${x},${y}`)) continue;
        if (dist[y][x] === Infinity || dist[y][x] < threshold) continue;
        if (allowed && !allowed.has(`${x},${y}`)) continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  }
  return null;
}

/** Levels are positive integers; anything else (e.g. corrupted saved data) falls back to 1. */
export function normalizeLevel(level: number): number {
  const n = Math.floor(level);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Generation retries until every requested feature fits. Ice levels usually
 * succeed within a handful of attempts (0 misses in 4,700 sampled builds), so
 * this cap is only a termination guard: past it the optional constraints (full
 * gem count, ice solvability) are relaxed so the game can never hang. When ice
 * has to be dropped the result says so via `iceFallback`, and the UI tells the
 * player rather than silently changing the level.
 */
const MAX_STRICT_ATTEMPTS = 600;

export function buildLevel(rawLevel: number, custom?: CustomSetup): LevelState {
  const level = normalizeLevel(rawLevel);
  const cfg = configForLevel(level, custom);
  for (let attempt = 0; ; attempt++) {
    const strict = attempt < MAX_STRICT_ATTEMPTS;
    const maze = generateMaze(cfg.cols, cfg.rows, cfg.braid);
    const start = { x: 0, y: 0 };
    const exit = { x: cfg.cols - 1, y: cfg.rows - 1 };
    const dist = bfsDistances(maze, start, exit);
    const maxDist = Math.max(...dist.flat().filter((d) => d !== Infinity));

    const occupied = new Set([ptKey(start), ptKey(exit)]);
    let iceAllowed: Set<string> | null = cfg.ice && strict ? iceExplore(maze, start, exit, null, null).visited : null;
    iceAllowed?.delete(ptKey(exit));

    const take = (minDist: number, allowed: Set<string> | null = iceAllowed): Point | null => {
      const p = pickCell(maze, dist, occupied, minDist, allowed);
      if (!p) return null;
      occupied.add(ptKey(p));
      return p;
    };

    const key = cfg.needsKey ? take(Math.floor(maxDist * 0.55)) : null;
    if (cfg.ice && key && iceAllowed) {
      iceAllowed = iceExplore(maze, start, exit, key, null).visited;
      iceAllowed.delete(ptKey(exit));
    }

    const portals = cfg.hasPortals
      ? (() => {
          const a = take(Math.floor(maxDist * 0.2));
          const b = take(Math.floor(maxDist * 0.5));
          return a && b ? ([a, b] as [Point, Point]) : null;
        })()
      : null;

    if (cfg.ice && iceAllowed) {
      iceAllowed = iceExplore(maze, start, exit, key, portals).visited;
      iceAllowed.delete(ptKey(exit));
    }

    const guardHome = cfg.hasGuard ? take(Math.floor(maxDist * 0.4), null) : null;
    const candle = cfg.fogRadius !== null ? take(Math.floor(maxDist * 0.3)) : null;
    const gems: Point[] = [];
    for (let i = 0; i < cfg.gemCount; i++) {
      const gem = take(0);
      if (!gem) break;
      gems.push(gem);
    }

    if (
      (cfg.needsKey && !key) ||
      (cfg.hasPortals && !portals) ||
      (cfg.hasGuard && !guardHome) ||
      (cfg.fogRadius !== null && !candle)
    ) {
      continue;
    }
    if (gems.length < cfg.gemCount && strict) continue;

    const iceOk = !cfg.ice || iceRouteOk(maze, start, exit, key, portals);
    if (!iceOk && strict) continue;

    return {
      level,
      maze,
      start,
      player: { ...start },
      exit,
      needsKey: cfg.needsKey,
      key,
      hasKey: false,
      gems,
      gemTotal: gems.length,
      guard: guardHome ? { ...guardHome } : null,
      guardHome,
      guardChase: cfg.guardChase,
      portals,
      fogRadius: cfg.fogRadius,
      candle,
      lit: false,
      lightBurst: 0,
      lightOrigin: null,
      ice: cfg.ice && iceOk,
      iceFallback: cfg.ice && !iceOk,
      shifting: cfg.shifting,
      trail: new Map([[ptKey(start), 0]]),
      trailLife: cfg.trailLife,
      moves: 0,
      levelPoints: 0,
      catches: 0,
      startedAt: Date.now(),
      finishedAt: null,
    };
  }
}
