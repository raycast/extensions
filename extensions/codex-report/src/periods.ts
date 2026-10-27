export type Period = "today" | "week" | "month";
export const periods: Record<Period, string> = { today: "Today", week: "This Week", month: "This Month" };

export function calendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function periodRange(period: Period, offset: number, now = new Date()) {
  // Local noon keeps calendar arithmetic stable across daylight-saving changes.
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "month") start.setDate(1);
  if (period === "month") start.setMonth(start.getMonth() + offset);
  else start.setDate(start.getDate() + offset * (period === "week" ? 7 : 1));

  const end = new Date(start);
  if (period === "week") end.setDate(end.getDate() + 6);
  if (period === "month") end.setMonth(end.getMonth() + 1, 0);
  const from = calendarDate(start);
  const to = offset === 0 ? calendarDate(now) : calendarDate(end);
  const title = periodTitle(period, offset, start);
  const dates: string[] = [];
  const cursor = new Date(start);
  while (calendarDate(cursor) <= to) {
    dates.push(calendarDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { from, to, dates, title };
}

function periodTitle(period: Period, offset: number, start: Date): string {
  if (offset === 0) return periods[period];
  if (period === "month") return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const formatted = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return period === "week" ? `Week of ${formatted}` : formatted;
}
