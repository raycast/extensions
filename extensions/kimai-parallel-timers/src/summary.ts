import { Entry } from "./api";

export function periodStarts(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  return { today, yesterday, week, month };
}

export function timeSummary(entries: Entry[], now = new Date()) {
  const starts = periodStarts(now);
  const totals = { today: 0, yesterday: 0, week: 0, month: 0 };
  for (const entry of new Map(entries.map((e) => [e.id, e])).values()) {
    const begin = Date.parse(entry.begin);
    if (!Number.isFinite(begin) || begin > now.getTime()) continue;
    const seconds = entry.end ? entry.duration : (now.getTime() - begin) / 1000;
    if (!Number.isFinite(seconds) || seconds < 0) continue;
    if (begin >= starts.yesterday.getTime() && begin < starts.today.getTime())
      totals.yesterday += seconds;
    for (const period of ["today", "week", "month"] as const) {
      if (begin >= starts[period].getTime()) totals[period] += seconds;
    }
  }
  const format = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  };
  return {
    today: format(totals.today),
    yesterday: format(totals.yesterday),
    week: format(totals.week),
    month: format(totals.month),
  };
}
