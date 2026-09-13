import { Color, Icon } from "@raycast/api";

/**
 * Parse an API date string into a local Date. The API emits `expiration_date`
 * as either `yyyy-MM-dd` (date-only) or an ISO timestamp. For date-only values
 * we construct a local-midnight Date so day math uses the user's timezone and
 * doesn't drift by a day (which `new Date("yyyy-MM-dd")` — parsed as UTC — would).
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** Today's date at local midnight, for stable day-difference math. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole-day difference (date - today). Negative = overdue, positive = in the future. */
export function daysUntil(date: Date, from: Date = startOfToday()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((a.getTime() - from.getTime()) / msPerDay);
}

export function formatDate(date: Date | null): string {
  if (!date) return "No date";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Human relative label, e.g. "3 days overdue", "Expires today", "in 12 days". */
export function relativeExpiry(date: Date | null): string {
  if (!date) return "No expiration date";
  const days = daysUntil(date);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

/**
 * Urgency accessory tag: 🔴 overdue/≤7d, 🟠 ≤30d, 🟡 ≤window, otherwise none.
 * Returns a color + icon suitable for a Raycast list accessory.
 */
export function urgencyColor(date: Date | null, windowDays: number): Color {
  if (!date) return Color.SecondaryText;
  const days = daysUntil(date);
  if (days <= 7) return Color.Red;
  if (days <= 30) return Color.Orange;
  if (days <= windowDays) return Color.Yellow;
  return Color.Green;
}

export function urgencyIcon(date: Date | null): Icon {
  if (!date) return Icon.Calendar;
  return daysUntil(date) < 0 ? Icon.Warning : Icon.Clock;
}

/** Serialize a Date to `yyyy-MM-dd` in local time (the format the API expects). */
export function toApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
