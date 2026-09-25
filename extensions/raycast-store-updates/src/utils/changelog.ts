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
// headings with no date (`## [Maintenance]`), single-digit days (`2023-11-5`), parenthesized
// dates (`(2022-03-19)`) and misspelled placeholders (`{PR_MREGE_DATE}`); a reviewer later
// found a month-name form (`- March, 4 2024`, extensions/turso). En and em dashes are accepted
// as the separator too. A stricter pattern either drops those sections, bullets included, or
// leaves the date glued to the title. The month alternative names real months only, so a
// title ending "- Release 12 2024" keeps its text.
const MONTH =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const MONTH_DATE = `${MONTH},?\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\s+${MONTH},?\\s+\\d{4}`;
const TRAILING_DATE = new RegExp(`\\s+[-–—]\\s+\\(?(\\{[A-Z_]+\\}|\\d{4}-\\d{1,2}-\\d{1,2}|${MONTH_DATE})\\)?$`, "i");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * A heading's date as local midnight, or undefined if it is not a real date. Accepts
 * `YYYY-M-D` and the month-name forms TRAILING_DATE admits.
 *
 * Built from numeric parts, NOT `new Date(`${stamp}T00:00:00`)`: that string form requires
 * two-digit fields, so `2023-11-5` — which appears in published changelogs — comes back
 * as an Invalid Date. And an Invalid Date is a truthy object, so it sailed past every
 * `if (date)` check and rendered as a row with no date at all. The round-trip comparison
 * rejects rollovers too: `2023-02-31` would otherwise quietly become March 3.
 */
function calendarDate(stamp: string): Date | undefined {
  const iso = stamp.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const [year, month, day] = iso
    ? iso.slice(1).map(Number)
    : [
        Number(stamp.match(/\d{4}/)?.[0]),
        MONTHS.indexOf((stamp.match(/[a-z]+/i)?.[0] ?? "").slice(0, 3).toLowerCase()) + 1,
        Number(stamp.match(/(?<!\d)\d{1,2}(?!\d)/)?.[0]),
      ];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

/**
 * Splits a CHANGELOG.md into its version sections, newest first (source order).
 *
 * Returns an empty array for anything it cannot recognize — a changelog with no `##`
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

/** A commit that touched an extension's CHANGELOG.md, newest first as GitHub lists them. */
export interface ChangelogCommit {
  sha: string;
  /** Committer date, ISO 8601 UTC — for a squash merge, the merge time. */
  date: string;
}

// A stamped heading's commit merged within two days after the start of its date (UTC).
// CI stamps in either UTC or US Pacific time, and sometimes a day behind the merge
// (Linear's `2026-07-14` merged at 07-15 09:24Z), but never ahead of it in the samples below.
const STAMP_WINDOW = 2 * 86_400_000;

/**
 * Pairs each version row with the commit that added it, or undefined when none can be named.
 *
 * The two lists are walked together newest-first: commits newer than a heading's window
 * touched the file without adding a version (a typo fix, a bulk sweep) and are skipped. A
 * heading that finds no commit of its own reuses the previous one when that commit also
 * fits its window, because one PR can add several versions (better-json's first merge
 * added four). A file written oldest-first is walked in reverse, or every pair would swap.
 *
 * Only the first 100 commits are fetched, so versions older than that go unpaired: they
 * lose the commit actions, but are never linked to the wrong commit.
 *
 * Measured 2026-09-24 against the commit diffs themselves. Over 157 headings in 30
 * extensions: 144 paired correctly, 10 unpaired (undated, or older than the file's
 * history), 3 wrong — each a heading whose author typed a date instead of
 * `{PR_MERGE_DATE}`, which no date rule can see through. A fresh 144 headings in 30 more
 * extensions: 135 correct, 9 unpaired, 0 wrong. Narrowing the window to one Pacific day
 * fixed none of the 3, and turned 29 correct pairs into 4 wrong and 25 unpaired.
 */
export function pairVersionCommits(versions: ChangelogVersion[], commits: ChangelogCommit[]): (string | undefined)[] {
  const dated = versions.filter((v) => v.date);
  const oldestFirst = dated.length > 1 && dated[0].date! < dated[dated.length - 1].date!;
  if (oldestFirst) return pairVersionCommits([...versions].reverse(), commits).reverse();

  const times = commits.map((c) => Date.parse(c.date));
  let next = 0;
  let last: number | undefined;
  return versions.map(({ date }) => {
    if (!date) return undefined;
    const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const fits = (i: number) => times[i] >= day && times[i] < day + STAMP_WINDOW;
    while (next < times.length && times[next] >= day + STAMP_WINDOW) next++;
    if (next < times.length && fits(next)) {
      last = next++;
      return commits[last].sha;
    }
    return last !== undefined && fits(last) ? commits[last].sha : undefined;
  });
}
