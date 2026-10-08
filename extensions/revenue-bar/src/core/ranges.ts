/**
 * Date ranges are computed in the machine's local time zone with calendar arithmetic (new Date(y, m, d)), so a range
 * that crosses a DST change still starts at local midnight, and "Today" is 23 or 25 hours long on change days.
 */
export type RangeId = "today" | "7d" | "30d" | "mtd";

export const RANGE_IDS: RangeId[] = ["today", "7d", "30d", "mtd"];

export const RANGE_TITLES: Record<RangeId, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  mtd: "Month to Date",
};

export type DateRange = {
  id: RangeId | "custom";
  label: string;
  /** Inclusive. */
  start: Date;
  /** Exclusive. */
  end: Date;
};

export function isRangeId(value: unknown): value is RangeId {
  return typeof value === "string" && (RANGE_IDS as string[]).includes(value);
}

export function parseRangeId(value: unknown, fallback: RangeId = "today"): RangeId {
  return isRangeId(value) ? value : fallback;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local midnight `days` calendar days after `date`'s local day (negative goes back). */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * - today: local midnight → now
 * - 7d / 30d: local midnight 6 / 29 calendar days ago → now (the current day counts as one of the days)
 * - mtd: local midnight on the 1st → now
 * The end is `now` (exclusive), so nothing in the future is ever requested.
 */
export function resolveRange(id: RangeId, now: Date = new Date()): DateRange {
  const today = startOfLocalDay(now);
  let start: Date;
  switch (id) {
    case "today":
      start = today;
      break;
    case "7d":
      start = addLocalDays(today, -6);
      break;
    case "30d":
      start = addLocalDays(today, -29);
      break;
    case "mtd":
      start = startOfLocalMonth(now);
      break;
  }
  return { id, label: RANGE_TITLES[id], start, end: new Date(now.getTime() + 1) };
}

export function customRange(start: Date, end: Date, label = "Custom"): DateRange {
  if (end.getTime() <= start.getTime()) {
    throw new Error("Range end must be after its start");
  }
  return { id: "custom", label, start, end };
}

export function isWithin(date: Date, range: DateRange): boolean {
  const t = date.getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

/** Seconds since the epoch, for APIs such as Stripe's `created[gte]`. */
export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/** UTC calendar date (YYYY-MM-DD). */
export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Gumroad filters by UTC calendar date (`after` is inclusive, `before` is exclusive). This returns the smallest
 * date window that fully covers the range; callers then filter precisely by timestamp.
 */
export function utcDateWindow(range: DateRange): { after: string; before: string } {
  const lastInstant = new Date(range.end.getTime() - 1);
  const dayAfterLast = new Date(
    Date.UTC(lastInstant.getUTCFullYear(), lastInstant.getUTCMonth(), lastInstant.getUTCDate() + 1),
  );
  return { after: toUtcDateString(range.start), before: toUtcDateString(dayAfterLast) };
}

/** Number of local calendar days the range touches. */
export function localDayCount(range: DateRange): number {
  let count = 0;
  for (let d = startOfLocalDay(range.start); d.getTime() < range.end.getTime(); d = addLocalDays(d, 1)) {
    count++;
  }
  return count;
}

export function sanitizeFilePart(value: string): string {
  return value
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
