/// The CLI speaks YYYY-MM-DD in a fixed en_US_POSIX Gregorian formatter, so
/// dates crossing the boundary are formatted and parsed from LOCAL date
/// components rather than via `toISOString()` — which would shift the day for
/// anyone east or west of UTC at the wrong hour.
export function formatDay(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/// The inverse of `formatDay`: a YYYY-MM-DD string parsed at local midnight,
/// not via `new Date(value)` alone, which parses a bare date as UTC midnight
/// and can print as the previous day for anyone west of UTC.
export function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/// Whole days between two dates' LOCAL start-of-day boundaries, ported from
/// `daysToDeadline` in SharedAssets/DueLabel.swift. Each boundary is remapped
/// onto its own UTC-midnight instant (via `Date.UTC` on its local Y/M/D) so
/// the subtraction is always an exact multiple of a day even across a DST
/// transition — a plain 24-hour-span diff would be off by one on the day the
/// clocks change.
function wholeDaysBetween(from: Date, to: Date): number {
  const toUTCDay = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((toUTCDay(to) - toUTCDay(from)) / MS_PER_DAY);
}

/// The deadline badge's terse text, ported from `DueLabel.text(_:)` in
/// SharedAssets/DueLabel.swift so a deadline reads identically in Raycast and
/// the app. Deliberately has no "Due" prefix there and none here — position
/// and colour (the red tag) carry the meaning.
export function deadlineLabel(
  deadline: string,
  today: Date = new Date(),
): string {
  const days = wholeDaysBetween(today, parseDay(deadline));
  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  if (days >= 1)
    return days > 99 ? "In 99+ days" : `In ${days} day${days === 1 ? "" : "s"}`;
  const ago = -days;
  return ago > 99 ? "99+ days ago" : `${ago} days ago`;
}

/// When a deadline starts being worth a colour, in days.
///
/// Mirrors the app's own default (`AppSettings.Default.deadlineLeadDays = 7`).
/// The phone's actual setting is unreadable from here — it lives in that app's
/// `UserDefaults.standard`, outside the shared App Group and unsynced, so no
/// CLI call can fetch it. The extension's own preference overrides this; see
/// `deadlineLeadDays()` in `preferences.ts`.
///
/// This module stays free of `@raycast/api` so vitest can exercise it without
/// the Raycast runtime, which is why the preference arrives as an ARGUMENT
/// rather than being read here.
export const DEADLINE_NEAR_DAYS = 7;

export type DeadlineUrgency = "past" | "near" | "far";

/// Whole days until a deadline: 0 today, negative once it has passed.
export function daysToDeadline(
  deadline: string,
  today: Date = new Date(),
): number {
  return wholeDaysBetween(today, parseDay(deadline));
}

/// How loudly a deadline should be drawn.
///
/// Three states, not two, because "has a deadline" and "the deadline is upon
/// you" are different facts and only the second earns red. A task due in three
/// months is information; a task due Thursday is a prompt. Everything red in a
/// list is nothing red.
export function deadlineUrgency(
  deadline: string,
  today: Date = new Date(),
  leadDays: number = DEADLINE_NEAR_DAYS,
): DeadlineUrgency {
  const days = daysToDeadline(deadline, today);
  if (days < 0) return "past";
  return days <= leadDays ? "near" : "far";
}

/// The integer that rides beside the flag: days remaining, negative once past,
/// clamped so a deadline years out cannot widen the row it sits in.
///
/// The sign is what disambiguates it — "6" and "−6" are six days away and six
/// days gone, and colour alone could not tell you which. A minus sign (U+2212),
/// not a hyphen: it aligns with the digits rather than sitting high and short.
export function deadlineCount(
  deadline: string,
  today: Date = new Date(),
): string {
  const days = daysToDeadline(deadline, today);
  if (days > 99) return "99+";
  if (days < -99) return "−99+";
  return days < 0 ? `−${-days}` : `${days}`;
}
