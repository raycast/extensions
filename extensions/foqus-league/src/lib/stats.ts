import { WALK_HORIZON_DAYS, dayKey, shiftDayKey, startOfDay, startOfWeek, walkStreaks } from "./streaks.ts";
import type { DayCell, GoalTotal, Session, Stats } from "./types.ts";

export const CALENDAR_WEEKS = 26;

type StatsOptions = {
  weekStartsOn: 0 | 1;
  calendarWeeks: number;
  now?: Date;
};

export const UNLABELLED = "No goal";

type DayTally = { minutes: Map<string, number>; sessions: Map<string, number> };

function minutesBetween(sessions: Session[], from: number, to: number): number {
  let total = 0;
  for (const s of sessions) if (s.start >= from && s.start < to) total += s.duration;
  return total;
}

function tallyDays(sessions: Session[]): DayTally {
  const minutes = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.start));
    minutes.set(key, (minutes.get(key) ?? 0) + s.duration);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return { minutes, sessions: counts };
}

function tallyGoals(sessions: Session[]): GoalTotal[] {
  const byName = new Map<string, GoalTotal>();
  for (const s of sessions) {
    const name = s.goal.trim() || UNLABELLED;
    const goal = byName.get(name) ?? { name, minutes: 0, sessions: 0 };
    goal.minutes += s.duration;
    goal.sessions += 1;
    byName.set(name, goal);
  }
  return [...byName.values()].sort((a, b) => b.minutes - a.minutes);
}

function levelsFor(dayTotals: number[]): (minutes: number) => DayCell["level"] {
  const values = dayTotals.filter((v) => v > 0).sort((a, b) => a - b);
  if (!values.length) return () => 0;
  const percentile = (f: number) => values[Math.min(values.length - 1, Math.floor(values.length * f))];
  const cuts = [percentile(0.25), percentile(0.55), percentile(0.82)];
  return (minutes) => {
    if (minutes <= 0) return 0;
    if (minutes < cuts[0]) return 1;
    if (minutes < cuts[1]) return 2;
    if (minutes < cuts[2]) return 3;
    return 4;
  };
}

function buildCalendar(tally: DayTally, shieldedDays: Set<string>, now: Date, opts: StatsOptions): DayCell[] {
  const level = levelsFor([...tally.minutes.values()]);
  const start = startOfWeek(now, opts.weekStartsOn);
  start.setDate(start.getDate() - (opts.calendarWeeks - 1) * 7);

  const today = dayKey(now);
  const days: DayCell[] = [];
  for (let key = dayKey(start); key <= today; key = shiftDayKey(key, 1)) {
    const minutes = tally.minutes.get(key) ?? 0;
    days.push({
      date: key,
      minutes,
      sessions: tally.sessions.get(key) ?? 0,
      level: level(minutes),
      shielded: shieldedDays.has(key),
    });
  }
  return days;
}

export function computeStats(sessions: Session[], opts: StatsOptions): Stats {
  const now = opts.now ?? new Date();
  const sorted = [...sessions].sort((a, b) => a.start - b.start);
  const tally = tallyDays(sorted);

  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekStart = startOfWeek(now, opts.weekStartsOn);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const activeDayKeys = [...tally.minutes.entries()]
    .filter(([, m]) => m > 0)
    .map(([key]) => key)
    .sort();
  const streak = walkStreaks(activeDayKeys, opts.weekStartsOn, now);

  const bestDay = [...tally.minutes.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totalMinutes: sorted.reduce((total, s) => total + s.duration, 0),
    totalSessions: sorted.length,
    firstSessionAt: sorted.length ? sorted[0].start : null,
    todayMinutes: minutesBetween(sorted, todayStart.getTime(), todayEnd.getTime()),
    weekMinutes: minutesBetween(sorted, weekStart.getTime(), weekEnd.getTime()),
    lastWeekMinutes: minutesBetween(sorted, lastWeekStart.getTime(), weekStart.getTime()),
    currentStreak: streak.current,
    shieldsLeft: streak.shieldsLeft,
    bestStreak: streak.best,
    bestStreakStart: streak.bestStart,
    bestStreakEnd: streak.bestEnd,
    goals: tallyGoals(sorted),
    days: buildCalendar(tally, streak.shieldedDays, now, opts),
    activeDays: activeDayKeys.length,
    longestSession: sorted.reduce<Session | null>((best, s) => (!best || s.duration > best.duration ? s : best), null),
    bestDay: bestDay ? { date: bestDay[0], minutes: bestDay[1] } : null,
  };
}

export type WeekTotal = { start: string; minutes: number };

export function weeklyTotals(sessions: Session[], from: number, weekStartsOn: 0 | 1, now = new Date()): WeekTotal[] {
  const sorted = [...sessions].sort((a, b) => a.start - b.start);
  const earliest = from || sorted[0]?.start;
  if (!earliest) return [];
  const horizon = now.getTime() - WALK_HORIZON_DAYS * 86_400_000;
  const first = Math.max(earliest, horizon);
  const out: WeekTotal[] = [];
  const end = startOfWeek(now, weekStartsOn).getTime();
  for (
    const walk = startOfWeek(new Date(first), weekStartsOn);
    walk.getTime() <= end;
    walk.setDate(walk.getDate() + 7)
  ) {
    const next = new Date(walk);
    next.setDate(next.getDate() + 7);
    out.push({ start: dayKey(walk), minutes: minutesBetween(sorted, walk.getTime(), next.getTime()) });
  }
  return out;
}

export type Period = "month" | "quarter" | "half" | "year" | "all";

export type PeriodRange = { from: number; to: number; label: string };

const PERIOD_MONTHS: Record<Exclude<Period, "all">, number> = { month: 1, quarter: 3, half: 6, year: 12 };

const shortMonth = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });

function periodLabel(period: Period, from: Date, span: number): string {
  switch (period) {
    case "month":
      return from.toLocaleString(undefined, { month: "long", year: "numeric" });
    case "quarter":
    case "half": {
      const last = new Date(from.getFullYear(), from.getMonth() + span - 1, 1);

      return `${shortMonth(from)}–${shortMonth(last)} ${from.getFullYear()}`;
    }
    default:
      return String(from.getFullYear());
  }
}

export function periodRange(period: Period, offset = 0, now = new Date()): PeriodRange {
  if (period === "all") return { from: 0, to: Number.MAX_SAFE_INTEGER, label: "All time" };

  const span = PERIOD_MONTHS[period];
  const d = startOfDay(now);
  const start = Math.floor(d.getMonth() / span) * span + offset * span;
  const from = new Date(d.getFullYear(), start, 1);

  return {
    from: from.getTime(),
    to: new Date(d.getFullYear(), start + span, 1).getTime(),
    label: periodLabel(period, from, span),
  };
}
