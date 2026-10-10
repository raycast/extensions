import Decimal from "decimal.js";
import { calendarDay, type HistoryPoint } from "./balance-history";
import { dateRange } from "./finance";
import { dateOnly, decimal } from "./format";
import type { Period, Transaction } from "./types";

export function spendingTrend(transactions: Transaction[], currency: string, period: Period, now = new Date()) {
  const range = dateRange(period, now);
  const daily = new Map<string, Decimal>();
  const seen = new Set<number>();
  let unplotted = 0;
  for (const transaction of transactions) {
    if (seen.has(transaction.id)) continue;
    seen.add(transaction.id);
    const amount = decimal(transaction.amount);
    if (!transaction.booked || transaction.currency !== currency || !amount?.isNegative()) continue;
    const date = calendarDay(transaction.booking_date);
    if (!date) {
      unplotted++;
      continue;
    }
    if ((range.after && date < range.after) || date > (range.before ?? dateOnly(now))) continue;
    daily.set(date, (daily.get(date) ?? new Decimal(0)).plus(amount.abs()));
  }
  const start = range.after ?? [...daily.keys()].sort()[0];
  const end = range.before ?? dateOnly(now);
  const points: HistoryPoint[] = [];
  if (start) {
    const day = new Date(`${start}T12:00:00`);
    while (dateOnly(day) <= end) {
      const date = dateOnly(day);
      points.push({ date, amount: (daily.get(date) ?? new Decimal(0)).toFixed() });
      day.setDate(day.getDate() + 1);
    }
  }
  const total = points.reduce((sum, point) => sum.plus(point.amount), new Decimal(0));
  return { points, total: total.toFixed(), unplotted };
}
