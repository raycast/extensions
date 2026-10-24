import { thisWeek } from "./stats.ts";
import { dayKey } from "./streaks.ts";
import { tierFor, type Tier } from "./theme.ts";
import type { Stats } from "./types.ts";

export type Moment = { key: string; text: string; short: string; reminder?: boolean; quiet?: boolean };

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

export const REMINDER_HOUR = 20;

const LEDGER_SIZE = 100;

export const DAILY_GOAL_LINES = [
  "🎯 Nice job reaching your daily goal!",
  "🎯 You hit your daily goal!",
  "🎯 Congrats on reaching your daily goal!",
];

export const reminderLines = (streak: number) => [
  `🔥 A quick session saves your ${streak} day streak!`,
  `🔥 One session before midnight keeps your ${streak} day streak going.`,
  `🔥 Time for a session to keep your ${streak} day streak!`,
];

function forDay<T>(lines: T[], day: string): T {
  const [y, m, d] = day.split("-").map(Number);
  return lines[Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) % lines.length];
}

export function moments(stats: Stats, dailyGoal: number, tiers: Tier[], now: Date): Moment[] {
  const today = stats.days.at(-1)?.date ?? dayKey(now);
  const week = thisWeek(stats);
  const weekKey = week[0]?.date ?? today;
  const { index } = tierFor(stats.weekMinutes, tiers);
  const streak = stats.currentStreak;
  const out: Moment[] = [];

  if (stats.todayMinutes > 0 && STREAK_MILESTONES.includes(streak)) {
    out.push({
      key: `streak:${today}:${streak}`,
      text: streak < 30 ? `🔥 Your streak just hit ${streak} days!` : `🔥 Congrats on reaching a ${streak} day streak!`,
      short: `🔥 ${streak} day streak!`,
    });
  }
  for (let i = index; i > 0; i--) {
    const tier = tiers[i];
    out.push({
      key: `league:${weekKey}:${i}`,
      text: `${tier.glyph} You've been promoted to the ${tier.name} league!`,
      short: `${tier.glyph} Promoted to ${tier.name} league`,
      ...(i < index ? { quiet: true } : {}),
    });
  }
  if (week.filter((d) => d.minutes >= dailyGoal).length >= 5) {
    out.push({
      key: `perfect:${weekKey}`,
      text: "⭐ You earned a perfect week!",
      short: "⭐ Perfect week",
    });
  }
  if (stats.weekMinutes > stats.lastWeekMinutes) {
    out.push({ key: `beat:${weekKey}`, text: "🏁 You're ahead of last week!", short: "🏁 Beat last week" });
  }
  if (stats.todayMinutes >= dailyGoal) {
    out.push({ key: `day:${today}`, text: forDay(DAILY_GOAL_LINES, today), short: "🎯 Daily goal" });
  }
  if (stats.todayMinutes === 0 && streak >= 2 && now.getHours() >= REMINDER_HOUR) {
    const line = forDay(reminderLines(streak), today);
    out.push({ key: `nudge:${today}`, text: line, short: line, reminder: true });
  }
  return out;
}

export function hudText(shown: Moment[]): string {
  return shown.length === 1 ? shown[0].text : shown.map((m) => m.short).join("  ·  ");
}

export function claim(announced: string[] | null, keys: string[]): { fresh: string[]; announced: string[] } {
  const seen = new Set(announced ?? []);
  const added = keys.filter((key) => !seen.has(key));
  return {
    fresh: announced ? added : [],
    announced: [...(announced ?? []), ...added].slice(-LEDGER_SIZE),
  };
}
