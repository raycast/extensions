/**
 * Formats a number of elapsed days or a date string into a human‑readable relative time.
 *
 * Behavior:
 * - Number input: Interpreted as elapsed whole days.
 * - String input: Parsed as a Date; computes days elapsed from now.
 * - Outputs:
 *     - "Today" for 0 days
 *     - "Yesterday" for 1 day
 *     - "N days ago" for 2–6 days
 *     - "N weeks ago" for 7–28 days
 *     - Locale date string for > 28 days
 * - Invalid input returns "NaN"
 * - Future dates are treated as "Tomorrow"
 *
 * @param value - Elapsed days (number) or a date string to compare with now.
 * @returns A relative time description or "NaN" on invalid input.
 */
export function formatDaysAgo(value: number | string): string {
  let days: number;

  if (typeof value === "string") {
    if (!value.trim()) return "NaN";
    const d = new Date(value);
    const t = d.getTime();
    if (Number.isNaN(t)) return "NaN";
    days = Math.floor((Date.now() - t) / 86_400_000);
  } else {
    if (!Number.isFinite(value)) return "NaN";
    days = Math.floor(value);
  }

  if (days < 0) return "Tomorrow";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 6) return `${days} days ago`;

  if (days <= 28) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString();
}

/**
 * Produces a compact, display-friendly locations string:
 * - 0 -> "Location TBD"
 * - 1 -> "City, ST"
 * - 2 -> "City1, City2"
 * - 3+ -> "City1 +N more"
 *
 * @param locations - Optional array of location strings.
 * @returns Concise location label.
 */
export const formatLocationsString = (locations?: string[]) => {
  if (!locations || locations.length === 0) return "Location TBD";
  if (locations.length === 1) return locations[0];
  if (locations.length === 2) return `${locations[0].split(",")[0]}, ${locations[1].split(",")[0]}`;
  return `${locations[0].split(",")[0]} +${locations.length - 1} more`;
};
