import { setTimeout as delay } from "node:timers/promises";
import type { Page } from "./explorer-api";

export const REVENUE_PAGE_SIZE = 365;
const DAY = 86400000;
export interface RevenueDay {
  id: string;
  value: number;
}
export interface DateRange {
  start?: string;
  end: string;
}
export function utcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
// DatePicker uses local calendar fields, even when the selected day represents UTC.
export function calendarDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function utcTodayForDatePicker(now = new Date()) {
  return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);
}
export function boundedRevenueRange(range: DateRange, createdAt?: number): Required<DateRange> {
  // Explicit date filters can reach imported transactions from before project creation.
  if (range.start) return { start: range.start, end: range.end };
  if (
    createdAt === undefined ||
    !Number.isFinite(createdAt) ||
    createdAt < 0 ||
    !Number.isFinite(new Date(createdAt).getTime())
  )
    throw new Error("RevenueCat did not return the project's creation date. Refresh or choose a date range.");
  return { start: utcDate(new Date(createdAt)), end: range.end };
}
export function shiftDate(date: string, days: number) {
  return utcDate(new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY));
}
export function revenueRange(period: string, today: string): DateRange {
  if (period === "month") return { start: `${today.slice(0, 7)}-01`, end: today };
  if (period === "year") return { start: `${today.slice(0, 4)}-01-01`, end: today };
  const days = { "7d": 7, "30d": 30, "90d": 90 }[period];
  return { start: days ? shiftDate(today, 1 - days) : undefined, end: today };
}

// Fetch a year of daily values at a time. The cursor is the next inclusive
// UTC date, so scrolling never overlaps or skips a day at batch boundaries.
export async function revenueDayPage(
  range: Required<DateRange>,
  next: string | undefined,
  read: (range: Required<DateRange>) => Promise<RevenueDay[]>,
  signal: AbortSignal,
): Promise<Page<RevenueDay>> {
  const end = next || range.end;
  const start = [shiftDate(end, 1 - REVENUE_PAGE_SIZE), range.start].sort().at(-1)!;
  if (start > end) return { items: [], next_page: null };
  signal.throwIfAborted();
  const items = await read({ start, end });
  signal.throwIfAborted();
  const days = new Map(items.map((day) => [day.id, day]));
  const ordered: RevenueDay[] = [];
  for (let date = end; date >= start; date = shiftDate(date, -1)) {
    const day = days.get(date);
    if (!day || !Number.isFinite(day.value))
      throw new Error("RevenueCat returned incomplete daily revenue data. Try refreshing.");
    ordered.push(day);
  }
  return { items: ordered, next_page: start === range.start ? null : shiftDate(start, -1) };
}

// The chart contains multiple measures for each day, including transaction
// counts. Select revenue explicitly and never treat missing data as zero.
export function parseRevenueChart(data: unknown, currency: string): RevenueDay[] {
  const chart = data as {
    object?: string;
    resolution?: string;
    yaxis_currency?: string;
    measures?: { display_name?: string; unit?: string }[];
    values?: { cohort?: number; measure?: number; value?: number }[];
    segments?: unknown[] | null;
    user_selectors?: { revenue_type?: string };
  } | null;
  if (
    !chart ||
    chart.object !== "chart_data" ||
    chart.resolution !== "day" ||
    chart.yaxis_currency !== currency ||
    !Array.isArray(chart.measures) ||
    !Array.isArray(chart.values) ||
    chart.segments?.length ||
    chart.user_selectors?.revenue_type !== "revenue"
  )
    throw new Error("Unexpected RevenueCat revenue chart response.");
  const measure = chart.measures.findIndex((m) => m.display_name === "Revenue" && m.unit === "$");
  if (measure < 0) throw new Error("RevenueCat returned no revenue measure.");
  const days = new Map<string, RevenueDay>();
  for (const entry of chart.values) {
    if (entry.measure !== measure) continue;
    if (!Number.isSafeInteger(entry.cohort) || entry.cohort! % 86400 !== 0 || !Number.isFinite(entry.value))
      throw new Error("Unexpected RevenueCat daily revenue value.");
    const date = new Date(entry.cohort! * 1000);
    if (!Number.isFinite(date.getTime())) throw new Error("Unexpected RevenueCat revenue date.");
    const id = utcDate(date);
    if (days.has(id)) throw new Error("RevenueCat returned duplicate daily revenue values.");
    days.set(id, { id, value: entry.value! });
  }
  return [...days.values()].sort((a, b) => b.id.localeCompare(a.id));
}

// Leave room for overview/widget traffic in the shared 25-request/minute domain.
// Keep budgets across filter changes and component remounts in this runtime.
const requestTimes = new Map<string, number[]>();
export async function reserveRevenueRequest(project: string, signal: AbortSignal, onWait?: (until?: number) => void) {
  while (true) {
    signal.throwIfAborted();
    const now = Date.now();
    const times = (requestTimes.get(project) || []).filter((time) => now - time < 61000);
    requestTimes.set(project, times);
    if (times.length < 20) {
      times.push(now);
      onWait?.();
      return;
    }
    onWait?.(times[0] + 61000);
    await delay(Math.max(1, times[0] + 61000 - now), undefined, { signal });
  }
}
