import { METERS_TO_FEET, MS_TO_KNOTS } from "./units";

// Native Intl formatters (reused across calls). `knot` and `nautical-mile`
// are not sanctioned Intl units, so ground speed is still formatted manually.
const feetFormatter = new Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "foot",
  unitDisplay: "short",
});
const degreeFormatter = new Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "degree",
  unitDisplay: "narrow",
});

/**
 * Format altitude from meters to feet with thousands separator.
 * e.g., 10668 → "35,000 ft"
 */
export function formatAltitude(meters: number | null): string {
  if (meters == null) return "N/A";
  return feetFormatter.format(Math.round(meters * METERS_TO_FEET));
}

/**
 * Format ground speed from m/s to knots.
 * e.g., 250 → "486 kts"
 */
export function formatSpeed(ms: number | null): string {
  if (ms == null) return "N/A";
  const knots = Math.round(ms * MS_TO_KNOTS);
  return `${knots} kts`;
}

/**
 * Format heading in degrees.
 * e.g., 267.3 → "267°"
 */
export function formatHeading(degrees: number | null): string {
  if (degrees == null) return "N/A";
  return degreeFormatter.format(Math.round(degrees));
}

/**
 * Format ETA from hours to human-readable string.
 * e.g., 2.25 → "~2h 15m"
 */
export function formatEta(hours: number | null): string {
  if (hours == null) return "N/A";

  // Clamp negatives (e.g. an arrival time already in the past) so we never
  // render negative hours/minutes.
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return `~${m}m`;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m}m`;
}

/**
 * Format a Date to a locale time string.
 *
 * When an IANA `timeZone` (e.g. "America/New_York") is given, the time is shown
 * in that zone with a short zone label (e.g. "3:00 PM EDT") so an arrival time
 * isn't silently displayed in the viewer's local zone. Without it, the local
 * zone is used with no label (e.g. "2:45 PM").
 */
export function formatTime(date: Date, timeZone?: string | null): string {
  const base: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  if (timeZone) {
    try {
      return date.toLocaleTimeString("en-US", {
        ...base,
        timeZone,
        timeZoneName: "short",
      });
    } catch {
      // Invalid IANA zone (e.g. an unexpected value from the API) throws a
      // RangeError — fall back to local formatting instead of crashing render.
    }
  }

  return date.toLocaleTimeString("en-US", base);
}
