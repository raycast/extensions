import { TIMEZONE_ALIASES } from "./aliases";

export { TIMEZONE_ALIASES };

/**
 * All valid IANA timezone identifiers supported by the current runtime.
 * Sourced from the JS built-in Intl API — no manual maintenance required.
 */
export const ALL_IANA_TIMEZONES: ReadonlyArray<string> =
  Intl.supportedValuesOf("timeZone");

/**
 * Derives a display name from an IANA timezone identifier by taking the
 * last path segment and replacing underscores with spaces.
 *
 * Examples:
 *   America/New_York            → "New York"
 *   America/Indiana/Indianapolis → "Indianapolis"
 *   Pacific/Auckland            → "Auckland"
 *   Etc/UTC                     → "UTC"
 */
export function ianaToDisplayName(iana: string): string {
  const segments = iana.split("/");
  return segments[segments.length - 1].replace(/_/g, " ");
}

/**
 * Returns all IANA timezone identifiers that contain the query string
 * in either the full identifier or the derived display name.
 * Used for fuzzy suggestions when a location cannot be resolved.
 */
export function getIanaSuggestions(query: string, limit = 3): string[] {
  const normalized = query.toLowerCase();
  return ALL_IANA_TIMEZONES.filter((tz) => {
    return (
      tz.toLowerCase().includes(normalized) ||
      ianaToDisplayName(tz).toLowerCase().includes(normalized)
    );
  })
    .map(ianaToDisplayName)
    .slice(0, limit);
}
