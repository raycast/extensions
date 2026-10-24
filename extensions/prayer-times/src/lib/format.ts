/** Hebrew, Arabic (Urdu), Syriac, Thaana, N'Ko and the Arabic presentation forms. */
const RTL_SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
/** Left-to-right mark: an invisible, strongly left-to-right character. */
const LRM = "\u200E";

/**
 * Keep a prayer name on the left of the text around it. A line that starts with an Urdu or Arabic
 * name (e.g. `مغرب -15`) is otherwise laid out right to left, putting the count on the left.
 * Left-to-right names are returned unchanged.
 *
 * @param name - Prayer name as configured.
 * @returns The name, wrapped in left-to-right marks when it contains right-to-left script.
 */
export function ltrName(name: string): string {
  return RTL_SCRIPT.test(name) ? `${LRM}${name}${LRM}` : name;
}

/**
 * Format a time in the system's locale and 12/24-hour setting, e.g. `4:34 PM`.
 *
 * @param date - Instant to format.
 * @returns Short time string.
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Compact duration between now and `target`, e.g. `23m`, `1h 05m`. Rounds up to whole minutes.
 *
 * @param target - Instant to measure to.
 * @param now - Reference instant.
 * @returns Duration string, `now` when under a minute.
 */
export function formatDuration(target: Date, now: Date): string {
  const minutes = Math.ceil(Math.abs(target.getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/**
 * `in 23m` for the future, `23m ago` for the past.
 *
 * @param target - Instant to describe.
 * @param now - Reference instant.
 * @returns Relative phrase.
 */
export function formatRelative(target: Date, now: Date): string {
  const span = formatDuration(target, now);
  if (span === "now") return "now";
  return target > now ? `in ${span}` : `${span} ago`;
}
