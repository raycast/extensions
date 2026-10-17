const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse an index `updated` value into a Date, or `null` if unusable.
 *
 * Dates arrive as `YYYY-MM-DD`, which `new Date()` reads as UTC midnight. That
 * would shift the day backwards for anyone west of UTC, so parse the parts by
 * hand and build a local-midnight Date — otherwise "today" reads as
 * "yesterday" all afternoon in California.
 */
export function parseUpdated(updated: string | undefined): Date | null {
  if (!updated) return null;

  // Anchored to the FULL string, and to a date-only value or the start of an
  // ISO timestamp. An unanchored prefix match accepts "2026-07-25oops" as a
  // valid date, which then renders as a confident-looking "Today".
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(updated);
  if (match) {
    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;

    // `new Date(2026, 1, 30)` silently rolls over to March 2 rather than
    // failing, so an impossible calendar date would render as a real one.
    // Reading the fields back catches it. This also rejects the two-digit-year
    // quirk, where `new Date(26, ...)` means 1926: setFullYear is not applied,
    // so a "0026-…" input fails the year comparison here.
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }

    return date;
  }

  return null;
}

/**
 * Whole days between two dates, comparing local calendar days rather than
 * elapsed milliseconds — so 11pm→1am counts as one day, not zero.
 */
function calendarDaysBetween(from: Date, to: Date): number {
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const startOfTo = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((startOfTo.getTime() - startOfFrom.getTime()) / MS_PER_DAY);
}

/**
 * Short relative label for the list accessory ("2d ago", "3w ago").
 *
 * Kept terse because it renders in the accessory slot, where a long string
 * squeezes the title on a narrow window.
 */
export function formatRelativeDate(updated: string | undefined, now: Date = new Date()): string | null {
  const date = parseUpdated(updated);
  if (!date) return null;

  const days = calendarDaysBetween(date, now);

  // A future date means a clock skew or a hand-edited row; don't render
  // "-3d ago".
  if (days < 0) return "Upcoming";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (days < 30) return weeks === 1 ? "1w ago" : `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (days < 365) return months === 1 ? "1mo ago" : `${months}mo ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? "1y ago" : `${years}y ago`;
}
