import Decimal from "decimal.js";
import { dateOnly, decimal } from "./format";
import type { BalanceEntry } from "./types";

export const HISTORY_RANGES = [
  { value: "7d", title: "Last 7 Days" },
  { value: "30d", title: "Last 30 Days" },
  { value: "3m", title: "Last 3 Months" },
  { value: "1y", title: "Last Year" },
  { value: "all", title: "All Time" },
] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number]["value"];
export interface HistoryPoint {
  date: string;
  amount: string;
}

export function calendarDay(value?: string | null): string | undefined {
  if (!value) return undefined;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : undefined;
}

export function historyStart(range: HistoryRange, now = new Date()): string | undefined {
  if (range === "all") return undefined;
  if (range === "7d" || range === "30d") {
    return dateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range === "7d" ? 6 : 29)));
  }
  const month = new Date(now.getFullYear(), now.getMonth() - (range === "3m" ? 3 : 12), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  month.setDate(Math.min(now.getDate(), lastDay));
  return dateOnly(month);
}

const TYPES = [
  "CLOSING_BOOKED",
  "CLOSING_CLEARED",
  "INTERIM_CLEARED",
  "INTERIM_BOOKED",
  "OPENING_BOOKED",
  "OPENING_CLEARED",
  "PREVIOUSLY_CLOSED_BOOKED",
  "CLOSING_AVAILABLE",
  "INTERIM_AVAILABLE",
  "INFORMATION",
  "OTHER",
];

/** Choose a consistent historical series; undated mutable balances are not history. */
export function balanceHistory(entries: BalanceEntry[], currency: string, range: HistoryRange, now = new Date()) {
  const today = dateOnly(now);
  const start = historyStart(range, now);
  const byType = new Map<string, Map<string, BalanceEntry>>();
  for (const entry of entries) {
    const day = calendarDay(entry.reference_date);
    if (!day || day > today || entry.currency !== currency || !decimal(entry.amount)) continue;
    const days = byType.get(entry.type) ?? new Map<string, BalanceEntry>();
    const previous = days.get(day);
    // A bank may revise a closing balance. Keep its latest revision per day.
    if (
      !previous ||
      (entry.updated_at || "") > (previous.updated_at || "") ||
      (entry.updated_at === previous.updated_at && entry.id > previous.id)
    )
      days.set(day, entry);
    byType.set(entry.type, days);
  }
  // Prefer a settled series with history, then another reported series with history,
  // then a single dated observation. Never splice different balance types together.
  const countInRange = (type: string) =>
    [...(byType.get(type)?.keys() ?? [])].filter((day) => !start || day >= start).length;
  const type = TYPES.find((type) => countInRange(type) >= 2) ?? TYPES.find((type) => countInRange(type) > 0);
  const selected = [...(byType.get(type || "")?.entries() ?? [])].sort(([a], [b]) => a.localeCompare(b));
  const inRange = selected.filter(([day]) => !start || day >= start);
  const points: HistoryPoint[] = inRange.map(([date, entry]) => ({ date, amount: decimal(entry.amount)!.toFixed() }));
  const first = points[0];
  const last = points.at(-1);
  const change = first && last && points.length >= 2 ? new Decimal(last.amount).minus(first.amount) : undefined;
  const percent =
    change && first && new Decimal(first.amount).gt(0) ? change.div(first.amount).times(100).toFixed(2) : undefined;
  return {
    currency,
    type,
    points,
    change: change?.toFixed(),
    percent,
    creditLimitIncluded: inRange.some(([, entry]) => entry.credit_limit_included),
  };
}
