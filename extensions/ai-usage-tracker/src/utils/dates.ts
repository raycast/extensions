export function toISO(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function isWorkday(d: Date, holidays: Set<string>): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  return !holidays.has(toISO(d));
}

export function countWorkdays(from: Date, to: Date, holidays: Set<string>): number {
  let count = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    if (isWorkday(d, holidays)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export interface MonthProgress {
  elapsed: number;
  total: number;
  pct: number;
  monthPct: number;
}

export function getMonthProgress(holidays: Set<string>): MonthProgress {
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), 1);
  const end = new Date(n.getFullYear(), n.getMonth() + 1, 0);
  const elapsed = countWorkdays(start, n, holidays);
  const total = countWorkdays(start, end, holidays);
  const pct = total > 0 ? elapsed / total : 0;
  return { elapsed, total, pct, monthPct: Math.round(pct * 100) };
}

export function countMonthHolidays(holidays: Set<string>): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  let count = 0;
  for (const date of holidays) {
    if (date.startsWith(prefix)) count++;
  }
  return count;
}
