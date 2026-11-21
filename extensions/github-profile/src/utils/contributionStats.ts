import { ContributionDay } from "../api/github";

const DAY_MS = 24 * 60 * 60 * 1000;

export function summarizeContributions(weeks: Array<{ contributionDays: ContributionDay[] }>, today = new Date()) {
  const todayKey = today.toISOString().slice(0, 10);
  const todayTime = Date.parse(todayKey);
  const days = weeks
    .flatMap((week) => week.contributionDays)
    .filter((day) => day.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  const counts = new Map(days.map((day) => [day.date, day.count]));

  let longestStreak = 0;
  let streak = 0;
  let previousDate = 0;
  for (const day of days) {
    const date = Date.parse(day.date);
    streak = day.count > 0 ? (date - previousDate === DAY_MS ? streak + 1 : 1) : 0;
    longestStreak = Math.max(longestStreak, streak);
    previousDate = date;
  }

  // Today's unfinished activity does not end a streak that continued through yesterday.
  let cursor = todayTime;
  if (!counts.get(todayKey)) cursor -= DAY_MS;
  let currentStreak = 0;
  while ((counts.get(new Date(cursor).toISOString().slice(0, 10)) ?? 0) > 0) {
    currentStreak += 1;
    cursor -= DAY_MS;
  }

  const last30Start = new Date(todayTime - 29 * DAY_MS).toISOString().slice(0, 10);
  return {
    total: days.reduce((sum, day) => sum + day.count, 0),
    last30Days: days.filter((day) => day.date >= last30Start).reduce((sum, day) => sum + day.count, 0),
    activeDays: days.filter((day) => day.count > 0).length,
    currentStreak,
    longestStreak,
  };
}
