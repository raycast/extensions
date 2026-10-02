/** Format a Date as a local YYYY-MM-DD string (no UTC shift). */
export function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today in the user's local timezone as YYYY-MM-DD. */
export function todayString(): string {
  return toDayString(new Date());
}

/** The YYYY-MM-DD string `n` days after the given day. */
export function addDays(day: string, n: number): string {
  // No trailing Z — parsed as local midnight, so DST shifts don't move the date.
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDayString(d);
}

/**
 * Whether `day` falls after `reference`. Both are YYYY-MM-DD, which is
 * zero-padded and big-endian, so comparing the strings compares the dates.
 */
export function isAfterDay(day: string, reference: string): boolean {
  return day > reference;
}

/** The first Monday strictly after the given day (YYYY-MM-DD). */
export function nextMonday(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  return addDays(day, (8 - d.getDay()) % 7 || 7);
}
