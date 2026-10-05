// This file imports nothing, deliberately: the Obsidian plugin and the Raycast
// extension carry a byte-for-byte copy of it in their public source, where
// ./constants (and the type model behind it) does not exist.
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

/** One rounded unit for compact duration readouts. Each unit is rounded directly
 * from the original minutes, including when carrying 60m to 1h or 24h to 1d.
 * Positive durations always show at least 1m; zero and expired values show 0m. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.round(minutes / MINUTES_PER_HOUR);
  if (hours >= HOURS_PER_DAY) return `${Math.round(minutes / MINUTES_PER_DAY)}d`;
  const roundedMinutes = Math.max(1, Math.round(minutes));
  return roundedMinutes >= MINUTES_PER_HOUR ? `${hours}h` : `${roundedMinutes}m`;
}

/** Hours and minutes for every task figure (countdowns, time worked, the menu
 * bar) and for task-goal progress. Omits zero units, keeps totals in hours, and
 * clamps at 0m, with the same nearest-minute rounding and 1m floor as
 * formatDuration. */
export function formatHoursMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const roundedMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / MINUTES_PER_HOUR);
  const remainingMinutes = roundedMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${remainingMinutes}m`;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

/** Days, hours and minutes, each unit present only when it is not zero: the
 * countdown the pops behind a padlock another lock holds print under "for
 * another:" ("1d 15h 17m", Anton's frame of 2026-09-25), where a single rounded
 * unit would read "2d" under a task title counting "1h 17m left". Same
 * nearest-minute rounding and 1m floor as formatHoursMinutes. */
export function formatDaysHoursMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const rounded = Math.max(1, Math.round(minutes));
  const days = Math.floor(rounded / MINUTES_PER_DAY);
  const hours = Math.floor((rounded % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const mins = rounded % MINUTES_PER_HOUR;
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(" ");
}

/** A deadline uses the same rounding as budgets, elapsed time and work totals. */
export function formatMsRemaining(until: number, now: number): string {
  return formatDuration((until - now) / MS_PER_MINUTE);
}

/** Category labels are stored lowercase, for example "shopping" or "adult
 *  content". The lock pills title-case them so the button reads "Lock Shopping"
 *  or "Lock Adult Content" — on the blocked page and, for an application walled
 *  by a category block, on the phone's app wall. */
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * A plan's date, as the Manage Subscription card states it: "21 Sept 2081".
 *
 * The SPELLING is the design's own, recovered rather than chosen — the frame Anton
 * drew reads "21 Sept 2081", which is exactly what `en-GB` gives at
 * `{day, month: "short", year}` ("Sept" with four letters is CLDR's British
 * abbreviation for September; `en-US` would give "Sep 21, 2081", a different shape
 * entirely). So the LOCALE IS PINNED rather than taken from the device: this
 * product has no other translated string in it, and a date that changes shape by
 * machine would be the one piece of the design that does.
 *
 * The space between the day and the month is a NON-BREAKING one, and that is the
 * design's too — it is Apple's, from the sheet the cancellation copy was measured
 * off — because a day and its month broken across two lines read as two dates. The
 * one between the month and the year is ordinary, so the line still has somewhere
 * to break on a narrow card.
 *
 * Built from `formatToParts` rather than by patching the formatted string, since
 * the only thing that reliably names the separator between the day and the month
 * is the part list itself.
 */
export function formatPlanDate(epochMs: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(epochMs));
  // The first literal after the day is the one that binds the two together; every
  // later separator is left as it came.
  let boundDay = false;
  return parts
    .map((part) => {
      if (part.type !== "literal") return part.value;
      if (boundDay) return part.value;
      boundDay = true;
      // Spelled as an escape so it is visible in source, exactly as the
      // placeholder this replaced spelled its own.
      return "\u00A0";
    })
    .join("");
}
