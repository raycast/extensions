/** One `## [Title] - date` section of a Raycast extension's CHANGELOG.md. */
export interface ChangelogVersion {
  /** Heading text with the brackets and trailing date stripped: "Raycast 2 Compatibility". */
  title: string;
  /** Parsed heading date, or undefined for an undated or `{PR_MERGE_DATE}` heading. */
  date?: Date;
  /** The section body (the bullet list), verbatim markdown. */
  body: string;
}

// The date after a heading's title, which is optional and lenient on purpose. A random 250
// of the monorepo's changelogs (2026-09-22, 868 headings, every one parsed to a row) had
// headings with no date (`## [Maintenance]`), single-digit days (`2023-11-5`), parenthesised
// dates (`(2022-03-19)`) and misspelled placeholders (`{PR_MREGE_DATE}`). A stricter pattern
// either drops those sections, bullets included, or leaves the date glued to the title.
const TRAILING_DATE = /\s+-\s+\(?(\{[A-Z_]+\}|\d{4}-\d{1,2}-\d{1,2})\)?$/;

/**
 * A heading's `YYYY-M-D` as local midnight, or undefined if it is not a real date.
 *
 * Built from numeric parts, NOT `new Date(`${stamp}T00:00:00`)`: that string form requires
 * two-digit fields, so `2023-11-5` — which appears in published changelogs — comes back
 * as an Invalid Date. And an Invalid Date is a truthy object, so it sailed past every
 * `if (date)` check and rendered as a row with no date at all. The round-trip comparison
 * rejects rollovers too: `2023-02-31` would otherwise quietly become March 3.
 */
function calendarDate(stamp: string): Date | undefined {
  const [year, month, day] = stamp.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

/**
 * Splits a CHANGELOG.md into its version sections, newest first (source order).
 *
 * Returns an empty array for anything it cannot recognise — a changelog with no `##`
 * headings at all, or an empty file — which is the caller's signal to fall back to
 * rendering the raw markdown rather than showing an empty list.
 */
export function parseChangelog(markdown: string | null | undefined): ChangelogVersion[] {
  if (!markdown) return [];

  // Split on `##` headings. `[^\S\r\n]+` is "any whitespace except a line break": plain
  // `\s+` would let a bare `##` line swallow the next line as its title, while `[ \t]+`
  // misses the non-breaking space some changelogs put after `##` (iata-code-decoder does,
  // on two of its seven headings — they folded into the row above). `###` never matches, since its third `#` is not whitespace, so
  // sub-headings stay inside their version's body. Whatever precedes the first `##` — the
  // `# <Name> Changelog` title — is dropped by the slice.
  return markdown
    .split(/^##[^\S\r\n]+/m)
    .slice(1)
    .map((section) => {
      const [heading, ...rest] = section.split("\n");
      let title = heading.trim();
      const dated = title.match(TRAILING_DATE);
      // `{PR_MERGE_DATE}` (and its typos) is Raycast CI's placeholder on an unmerged entry.
      const stamp = dated?.[1];
      const date = stamp && !stamp.startsWith("{") ? calendarDate(stamp) : undefined;
      if (dated) title = title.slice(0, dated.index).trim();
      return { title: title.replace(/^\[(.+)\]$/, "$1").trim(), date, body: rest.join("\n").trim() };
    });
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Largest-first, so 90 minutes reads "2 hours ago" rather than "90 minutes ago".
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/**
 * A friendly age for a version heading: "12 hours ago", "yesterday", "Aug 5, 2026".
 *
 * Beyond a month the relative form stops being informative ("2 months ago" tells you
 * less than a date does), so it switches to an absolute date. Headings carry a date but
 * no time, so a same-day entry is midnight-anchored and reads in hours — which is why
 * the hour and minute units are here at all.
 */
export function formatVersionAge(date: Date | undefined): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined;

  const elapsed = Date.now() - date.getTime();
  // A future date (a typo in the heading, or clock skew) would otherwise match no unit
  // and fall through to "just now" — presenting a date nobody can vouch for as brand new.
  if (elapsed < 0 || elapsed >= 30 * 86_400_000) {
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  // floor, not round: a 12-hour-old entry is 0.5 days, and rounding that to 1 renders it
  // as "yesterday" — which is both wrong and the exact case this format exists to show.
  for (const [unit, ms] of UNITS) {
    const value = Math.floor(elapsed / ms);
    if (value >= 1) return RELATIVE.format(-value, unit);
  }
  return "just now";
}
