/**
 * Dates in Hule are floating wall-clock values paired with an `allDay` flag —
 * never zoned offsets meaning "shift by timezone". Everything here works in the
 * viewer's own calendar day for the same reason.
 */

/** `YYYY-MM-DD` in local time — the shape the API takes for an all-day date. */
export function toFloatingDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The calendar day a floating value names, as a local `Date` at midnight.
 *
 * Read off the STRING, never through `new Date(value)`: the API serialises a
 * floating wall-clock date with a `Z` suffix (`2026-09-03T00:00:00.000Z`), so
 * parsing it as an instant and then reading local components moves the day back
 * for every viewer west of UTC — a task due today would read as overdue.
 */
function floatingDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole calendar days from today to `dueDate`; null when there is no usable date. */
export function daysUntil(dueDate: string | undefined): number | null {
  if (!dueDate) return null;
  const due = floatingDay(dueDate);
  if (!due) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Rounded rather than floored: across a daylight-saving change two local
  // midnights sit 23 or 25 hours apart, which would otherwise lose a day.
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** "Overdue", "Today", "Tomorrow", or the plain date — read at a glance. */
export function dueLabel(dueDate: string | undefined): string | undefined {
  const days = daysUntil(dueDate);
  if (days === null) return undefined;
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return floatingDay(dueDate as string)?.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
