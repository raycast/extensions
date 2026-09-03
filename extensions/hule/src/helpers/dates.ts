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

/** Whole calendar days from today to `dueDate`; null when there is no usable date. */
export function daysUntil(dueDate: string | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(due) - startOfDay(new Date())) / 86_400_000);
}

/** "Overdue", "Today", "Tomorrow", or the plain date — read at a glance. */
export function dueLabel(dueDate: string | undefined): string | undefined {
  const days = daysUntil(dueDate);
  if (days === null) return undefined;
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Date(dueDate as string).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
