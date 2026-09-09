import { format, formatDistance } from "date-fns";

/** ISO timestamp → friendly label. Pure (no @raycast/api) so it's cheaply testable. */
export function friendlyDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hours = Math.abs(now.getTime() - date.getTime()) / 36e5;
  if (hours < 48) return formatDistance(date, now, { addSuffix: true });
  if (hours < 24 * 365) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

/** Plain YYYY-MM-DD (no time component) → "MMM d, yyyy". */
export function friendlyDay(isoDay: string): string {
  const date = new Date(isoDay + "T00:00:00");
  if (Number.isNaN(date.getTime())) return isoDay;
  return format(date, "MMM d, yyyy");
}
