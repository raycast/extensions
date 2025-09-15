/**
 * Converts a day count into a human-readable relative string (Today, Yesterday, N days ago).
 *
 * @param days - Number of days elapsed.
 * @returns Relative time description or empty string on invalid input.
 */
export function formatDaysAgo(days: number): string {
  if (!Number.isFinite(days)) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
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

/**
 * Formats a "Last updated ..." accessory string given an ISO timestamp.
 * Uses relative phrasing within 30 days, otherwise a formatted date.
 *
 * @param iso - ISO timestamp string.
 * @returns A human-readable "Last updated ..." string.
 */
export function formatLastUpdated(iso?: string): string {
  if (!iso) return "Last updated —";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Last updated —";

  const diffDays = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 30) {
    const rel = formatDaysAgo(diffDays).toLowerCase();
    return `Last updated ${rel}`;
  }
  return `Last updated on ${d.toLocaleDateString()}`;
}

/**
 * Formats an "Added ..." accessory string from a numeric days-ago value.
 * Uses relative phrasing within 30 days, otherwise a date string.
 *
 * @param days - Days since added.
 * @returns A human-readable "Added ..." string.
 */
export function formatAddedFromDaysAgo(days: number): string {
  if (!Number.isFinite(days)) return "";
  const whole = Math.floor(days);

  if (whole <= 30) {
    return `Added ${formatDaysAgo(whole).toLowerCase()}`;
  }

  const d = new Date();
  d.setDate(d.getDate() - whole);
  return `Added on ${d.toLocaleDateString()}`;
}
