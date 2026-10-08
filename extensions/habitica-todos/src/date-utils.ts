/**
 * Converts any date-like value to a YYYY-MM-DD string for the Habitica API.
 *
 * Uses local date components rather than .toISOString() so a Date picked in
 * the user's local timezone serializes to the same calendar day. Otherwise
 * a date picked just before midnight local time can round forward a day
 * (e.g. picking Oct 15 in UTC+9 would otherwise serialize as Oct 14 UTC).
 *
 * Returns undefined when the value is absent or not parseable.
 */
export function toHabiticaDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;

  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  }

  if (!date || Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a Habitica task date (ISO string at UTC midnight, e.g. 2025-10-15T00:00:00.000Z)
 * into a local-midnight Date. We treat the UTC calendar day as the intended day so the
 * displayed date matches what the user picked, regardless of timezone offset.
 */
export function parseHabiticaDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // For "YYYY-MM-DD" strings, use the calendar components directly.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}
