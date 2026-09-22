import type { Category, FilterMode } from "./focusSetup.ts";
import type { Session } from "./types.ts";

export const DEFAULT_MINUTES = 25;

export const QUICK_STARTS = 3;

export const RECENT_MS = 90 * 24 * 60 * 60 * 1000;

export const START_SCREEN_URL = "raycast://extensions/raycast/raycast-focus/start-focus-session";

export function startSessionUrl(goal: string, minutes: number, categories: Category[], mode: FilterMode = "block") {
  const query = [`goal=${encodeURIComponent(goal)}`, `duration=${Math.round(minutes * 60)}`];
  if (categories.length) {
    query.push(
      `mode=${encodeURIComponent(mode)}`,
      `categories=${categories.map((c) => encodeURIComponent(c.id)).join(",")}`,
    );
  }
  return `raycast://focus/start?${query.join("&")}`;
}

export type QuickStart = {
  name: string;
  minutes: number;
  lastAt: number;
};

export function quickStartGoals(sessions: Session[]): QuickStart[] {
  const goals = new Map<string, { name: string; lastAt: number; lengths: Map<number, number> }>();
  for (const s of sessions) {
    const name = s.goal.trim();
    if (!name) continue;
    const goal = goals.get(name.toLowerCase()) ?? { name, lastAt: s.start, lengths: new Map() };
    if (s.start >= goal.lastAt) {
      goal.lastAt = s.start;
      goal.name = name;
    }
    const bucket = s.duration < 5 ? Math.max(1, Math.round(s.duration)) : Math.round(s.duration / 5) * 5;
    goal.lengths.set(bucket, (goal.lengths.get(bucket) ?? 0) + 1);
    goals.set(name.toLowerCase(), goal);
  }
  return [...goals.values()]
    .sort((a, b) => b.lastAt - a.lastAt)
    .map(({ name, lastAt, lengths }) => ({ name, lastAt, minutes: typicalMinutes(lengths) }));
}

function typicalMinutes(lengths: Map<number, number>): number {
  let best = DEFAULT_MINUTES;
  let bestCount = 0;
  for (const [minutes, count] of lengths) {
    if (count > bestCount || (count === bestCount && minutes > best)) {
      best = minutes;
      bestCount = count;
    }
  }
  return best;
}
