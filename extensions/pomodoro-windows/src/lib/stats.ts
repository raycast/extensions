import { HistoryEntry } from "./engine";
import { startOfDay } from "./format";

export interface Stats {
  todayCount: number;
  todayFocusMs: number;
  weekCount: number;
  weekFocusMs: number;
  totalCount: number;
  totalFocusMs: number;
  streakDays: number;
  bestDayCount: number;
  averagePerActiveDay: number;
  topLabels: { label: string; count: number; focusMs: number }[];
}

const DAY = 24 * 3600_000;

function isFocusDone(e: HistoryEntry) {
  return e.phase === "focus" && e.completed;
}

/** Previous calendar day's midnight (DST-safe). */
function prevDay(dayStart: number): number {
  return startOfDay(dayStart - DAY / 2);
}

export function computeStats(history: HistoryEntry[], now: number): Stats {
  const today = startOfDay(now);
  const weekStart = startOfDay(now - 6 * DAY);
  const focus = history.filter((e) => e.phase === "focus");

  const perDay = new Map<number, number>();
  for (const e of focus) {
    if (!isFocusDone(e)) continue;
    const day = startOfDay(e.endedAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  // Streak: consecutive days with at least one completed focus, ending today (or yesterday if today is empty so far).
  let streakDays = 0;
  let cursor = perDay.has(today) ? today : prevDay(today);
  while (perDay.has(cursor)) {
    streakDays++;
    cursor = prevDay(cursor);
  }

  const sum = (entries: HistoryEntry[]) => entries.reduce((acc, e) => acc + e.actualMs, 0);
  const todayEntries = focus.filter((e) => e.endedAt >= today);
  const weekEntries = focus.filter((e) => e.endedAt >= weekStart);

  const labels = new Map<string, { count: number; focusMs: number }>();
  for (const e of focus) {
    if (!e.label) continue;
    const item = labels.get(e.label) ?? { count: 0, focusMs: 0 };
    if (e.completed) item.count++;
    item.focusMs += e.actualMs;
    labels.set(e.label, item);
  }

  const totalCount = focus.filter(isFocusDone).length;
  return {
    todayCount: todayEntries.filter(isFocusDone).length,
    todayFocusMs: sum(todayEntries),
    weekCount: weekEntries.filter(isFocusDone).length,
    weekFocusMs: sum(weekEntries),
    totalCount,
    totalFocusMs: sum(focus),
    streakDays,
    bestDayCount: Math.max(0, ...perDay.values()),
    averagePerActiveDay: perDay.size ? totalCount / perDay.size : 0,
    topLabels: [...labels.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.focusMs - a.focusMs)
      .slice(0, 5),
  };
}
