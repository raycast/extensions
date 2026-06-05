import type { DateRange } from "./types";

export type PeriodKey = "week" | "month";

export const PERIOD_KEYS: PeriodKey[] = ["week", "month"];

export const periodLabels: Record<PeriodKey, string> = {
  week: "This Week",
  month: "This Month",
};

function startOfWeekSunday(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

/** Calendar-aligned windows (local time): week = Sunday → today, month = 1st → today. */
export function getPeriodRange(period: PeriodKey): DateRange {
  const end = new Date();
  const start = new Date(end);

  if (period === "week") {
    return { start: startOfWeekSunday(end), end };
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/** Full calendar period bounds: week = Sun → Sat, month = 1st → last day. */
export function getPeriodCalendarBounds(period: PeriodKey): DateRange {
  const anchor = new Date();

  if (period === "week") {
    const start = startOfWeekSunday(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(anchor);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Inclusive calendar days from period start through today. */
export function getPeriodElapsedDays(period: PeriodKey): number {
  const { start, end } = getPeriodRange(period);
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  return Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1;
}

/** Load window: month start plus any week days before the 1st. */
export function getUsageLoadRange(): DateRange {
  const monthRange = getPeriodRange("month");
  const weekRange = getPeriodRange("week");
  return {
    start: new Date(
      Math.min(monthRange.start.getTime(), weekRange.start.getTime()),
    ),
    end: monthRange.end,
  };
}

export function formatTokens(tokens: number) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return formatNumber(tokens);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

function isValidCurrencyCode(code: string): boolean {
  if (!code || code.length !== 3) return false;
  try {
    new Intl.NumberFormat(undefined, { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

function safeCurrencyCode(currency: string): string {
  return isValidCurrencyCode(currency) ? currency : "USD";
}

export function roundMoneyToCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/** Whole dollars omit cents ($300); fractional amounts keep two places ($1.50). */
function minimumMoneyFractionDigits(value: number): 0 | 2 {
  return Math.round(value * 100) % 100 === 0 ? 0 : 2;
}

export function formatCurrency(value: number, currency: string) {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: safeCurrencyCode(currency),
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 10 ? 2 : 4,
  }).format(value);
  return formatted.replace(/\bUS\$/g, "$");
}

/** Currency for dashboards; omits cents when zero (e.g. $300, not $300.00). */
export function formatCurrencyMoney(value: number, currency: string) {
  const rounded = roundMoneyToCents(value);
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: safeCurrencyCode(currency),
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: minimumMoneyFractionDigits(rounded),
    maximumFractionDigits: 2,
  }).format(rounded);
  return formatted.replace(/\bUS\$/g, "$");
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

/** Calendar date for list rows (no relative phrasing like “Yesterday”). */
export function formatShortDate(value: Date) {
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  if (value.getFullYear() !== now.getFullYear()) {
    opts.year = "numeric";
  }
  return new Intl.DateTimeFormat(undefined, opts).format(value);
}

/** Compact range for narrow metadata columns, e.g. `1–30 Jun` or `31 May–6 Jun`. */
export function formatDateRangeCompact(start: Date, end: Date): string {
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const monthFmt = new Intl.DateTimeFormat(undefined, { month: "short" });
  const endMonthStr = monthFmt.format(end);

  if (startYear === endYear && startMonth === endMonth && startDay === endDay) {
    return `${startDay} ${endMonthStr}`;
  }

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}–${endDay} ${endMonthStr}`;
  }

  const startMonthStr = monthFmt.format(start);
  if (startYear === endYear) {
    return `${startDay} ${startMonthStr}–${endDay} ${endMonthStr}`;
  }

  return `${startDay} ${startMonthStr} ${startYear}–${endDay} ${endMonthStr} ${endYear}`;
}
