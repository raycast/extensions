import { readFile } from "fs/promises";
import { supportFile } from "./snapshot";

/**
 * Lancetta's `history.jsonl` (and the generation rotated into `history.1.jsonl` at 4 MiB):
 * one line per reading. It is the app's internal record, not a promised interface like
 * `usage.json`, so this reads it defensively and only for the charts:
 *
 * - several copies of the app append to it (an installed one, a worktree's), so a line is
 *   kept only for the route the snapshot reports for its agent;
 * - a window is told by its reset, not by the clock: Claude's week can be moved, and Codex's
 *   reset wanders by minutes to hours from one reading to the next, so a line belongs to a
 *   window when its reset is within `RESET_SLACK` of that window's;
 * - a line the app was writing while this read is skipped.
 *
 * TODO: read a series the app exports instead, once `usage.json` carries one.
 */
const HISTORY_FILES = ["history.1.jsonl", "history.jsonl"].map(supportFile);

/** How far a line's reset may sit from its window's and still be that window. */
const RESET_SLACK = 3 * 3600;

export type Point = { at: number; used: number };

export type Line = {
  at: number;
  agent: string;
  route?: string;
  sevenDay?: number;
  sevenReset?: number;
  fiveHour?: number;
  fiveReset?: number;
  scoped?: Record<string, { used?: number; reset?: number }>;
};

/** What a window is called in a line: its two fields, or a model's own week inside `scoped`. */
export type WindowKey = { kind: "sevenDay" } | { kind: "fiveHour" } | { kind: "model"; id: string };

/**
 * Every agent's lines, oldest first, from one read and one parse of the files: `routes` maps each
 * watched agent to the route its snapshot reports. An older line has no route: it predates the
 * field, and is kept.
 */
export async function loadHistory(routes: Record<string, string | null>): Promise<Record<string, Line[]>> {
  const byAgent: Record<string, Line[]> = Object.fromEntries(Object.keys(routes).map((agent) => [agent, []]));
  const texts = await Promise.all(HISTORY_FILES.map((file) => readFile(file, "utf8").catch(() => "")));
  for (const text of texts) {
    for (const raw of text.split("\n")) {
      if (!raw.trim()) continue;
      let line: Line;
      try {
        line = JSON.parse(raw) as Line;
      } catch {
        continue; // a line cut by a write in progress
      }
      const lines = byAgent[line.agent];
      const route = routes[line.agent];
      if (lines && (!route || !line.route || line.route === route)) lines.push(line);
    }
  }
  for (const lines of Object.values(byAgent)) lines.sort((a, b) => a.at - b.at);
  return byAgent;
}

function reading(line: Line, key: WindowKey): { used: number; reset: number | null } | null {
  if (key.kind === "model") {
    const scoped = line.scoped?.[key.id];
    return typeof scoped?.used === "number" ? { used: scoped.used, reset: scoped.reset ?? null } : null;
  }
  const used = line[key.kind];
  const reset = key.kind === "sevenDay" ? line.sevenReset : line.fiveReset;
  return typeof used === "number" ? { used, reset: reset ?? null } : null;
}

/**
 * The readings of the window that resets at `resetsAt`, from `opensAt` to `now`. A line
 * with no reset (an older one) is taken by its time alone.
 */
export function windowSeries(lines: Line[], key: WindowKey, opensAt: number, resetsAt: number, now: number): Point[] {
  const out: Point[] = [];
  for (const line of lines) {
    if (line.at < opensAt || line.at > now) continue;
    const r = reading(line, key);
    if (!r) continue;
    if (r.reset !== null && Math.abs(r.reset - resetsAt) > RESET_SLACK) continue;
    out.push({ at: line.at, used: r.used });
  }
  return out;
}

/**
 * The window before this one: the lines whose reset is this window's opening, moved forward
 * by one span so they draw over this one. Empty when the previous window was not recorded.
 */
export function previousSeries(lines: Line[], key: WindowKey, opensAt: number, span: number): Point[] {
  const out: Point[] = [];
  for (const line of lines) {
    if (line.at >= opensAt || line.at < opensAt - span - RESET_SLACK) continue;
    const r = reading(line, key);
    if (!r || r.reset === null || Math.abs(r.reset - opensAt) > RESET_SLACK) continue;
    out.push({ at: line.at + span, used: r.used });
  }
  return out;
}
