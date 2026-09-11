import * as chrono from "chrono-node";

/**
 * Builds an Orbit Home deep link with an optional search query.
 *
 * @example
 * buildOrbitHomeUrl();
 * // => "orbit://home"
 *
 * @example
 * buildOrbitHomeUrl("invoice OR receipt ＠Chrome");
 * // => "orbit://home?search=invoice+OR+receipt+%40Chrome"
 */
export function buildOrbitHomeUrl(searchQuery?: string) {
  const normalizedQuery = (searchQuery ?? "").trim();
  if (!normalizedQuery) {
    return "orbit://home";
  }

  return `orbit://home?${new URLSearchParams({ search: normalizedQuery }).toString()}`;
}

/**
 * Builds an Orbit Timeline deep link with an optional date parameter.
 *
 * Accepted formats:
 * - `YYYY-MM-DD`
 * - `YYYY-MM-DDTHH:mm:ss`
 * - `YYYY-MM-DDTHH:mm:ssZ`
 *
 * @example
 * buildOrbitTimelineUrl();
 * // => "orbit://timeline"
 *
 * @example
 * buildOrbitTimelineUrl("2026-03-03");
 * // => "orbit://timeline?date=2026-03-03"
 *
 * @example
 * buildOrbitTimelineUrl("2026-03-03T14:00:00Z");
 * // => "orbit://timeline?date=2026-03-03T14%3A00%3A00Z"
 */
export function buildOrbitTimelineUrl(date?: string) {
  const normalizedDate = (date ?? "").trim();
  if (!normalizedDate) {
    return "orbit://timeline";
  }

  return `orbit://timeline?${new URLSearchParams({ date: normalizedDate }).toString()}`;
}

/**
 * Returns the Orbit Settings deep link.
 *
 * @example
 * buildOrbitSettingsUrl();
 * // => "orbit://settings"
 */
export function buildOrbitSettingsUrl() {
  return "orbit://settings";
}

/**
 * Normalizes an ISO datetime string to UTC (`YYYY-MM-DDTHH:mm:ssZ`).
 *
 * This helper accepts an ISO datetime with either `Z` or an explicit offset,
 * then converts it to UTC at second precision.
 *
 * @example
 * normalizeTimelineTimestampUtc("2026-03-03T15:00:00+01:00");
 * // => "2026-03-03T14:00:00Z"
 *
 * @example
 * normalizeTimelineTimestampUtc("2026-03-03T14:00:00Z");
 * // => "2026-03-03T14:00:00Z"
 */
export function normalizeTimelineTimestampUtc(input: string) {
  const value = input.trim();
  if (!value) {
    throw new Error("Timestamp input cannot be empty");
  }

  if (!isIsoDateTimeWithOffset(value)) {
    throw new Error(
      "Timestamp must be an ISO datetime with timezone, e.g. 2026-03-03T14:00:00Z or 2026-03-03T15:00:00+01:00",
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO timestamp: "${input}"`);
  }

  return formatUtcDateTime(date);
}

/**
 * Parses natural-language date/time input into Orbit Timeline format.
 *
 * Returns:
 * - `YYYY-MM-DD` when the input has no explicit time
 * - `YYYY-MM-DDTHH:mm:ssZ` when the input includes a time (UTC-normalized)
 *
 * @example
 * resolveTimelineDateParam("yesterday");
 * // => "2026-03-03" (depending on current date)
 *
 * @example
 * resolveTimelineDateParam("yesterday at 3pm");
 * // => "2026-03-03T14:00:00Z" (example for Europe/Berlin)
 */
export function resolveTimelineDateParam(input: string, referenceDate: Date = new Date()) {
  const value = input.trim();
  if (!value) {
    throw new Error("Date input cannot be empty");
  }

  const results = chrono.parse(value, referenceDate);
  if (results.length === 0 || !results[0]) {
    throw new Error(`Could not understand date: "${input}"`);
  }

  const result = results[0];
  const date = result.start.date();
  const hasTime = result.start.isCertain("hour");

  return hasTime ? formatUtcDateTime(date) : formatDate(date);
}

/**
 * Formats a `Date` as `YYYY-MM-DD` in local calendar date.
 *
 * @example
 * formatDate(new Date("2026-03-03T14:00:00Z"));
 * // => "2026-03-03"
 */
function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a `Date` as UTC `YYYY-MM-DDTHH:mm:ssZ`.
 *
 * @example
 * formatUtcDateTime(new Date("2026-03-03T14:00:00.500Z"));
 * // => "2026-03-03T14:00:00Z"
 */
function formatUtcDateTime(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Checks whether input is an ISO datetime with explicit timezone.
 *
 * @example
 * isIsoDateTimeWithOffset("2026-03-03T14:00:00Z");
 * // => true
 *
 * @example
 * isIsoDateTimeWithOffset("2026-03-03");
 * // => false
 */
function isIsoDateTimeWithOffset(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(value);
}
