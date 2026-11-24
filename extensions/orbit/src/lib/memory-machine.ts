import * as chrono from "chrono-node";

/**
 * Builds a Memory Machine Search deep link with an optional search query.
 *
 * @example
 * buildMemoryMachineSearchUrl();
 * // => "memorymachine://search"
 *
 * @example
 * buildMemoryMachineSearchUrl("(invoice OR receipt) app:Chrome");
 * // => "memorymachine://search?term=%28invoice+OR+receipt%29+app%3AChrome"
 */
export function buildMemoryMachineSearchUrl(searchQuery?: string) {
  const normalizedQuery = (searchQuery ?? "").trim();
  if (!normalizedQuery) {
    return "memorymachine://search";
  }

  return `memorymachine://search?${new URLSearchParams({ term: normalizedQuery }).toString()}`;
}

/**
 * Builds a Memory Machine History deep link with an optional date parameter.
 *
 * Accepted formats:
 * - `YYYY-MM-DD`
 * - `YYYY-MM-DDTHH:mm:ss`
 * - `YYYY-MM-DDTHH:mm:ssZ`
 *
 * @example
 * buildMemoryMachineHistoryUrl();
 * // => "memorymachine://history"
 *
 * @example
 * buildMemoryMachineHistoryUrl("2026-03-03");
 * // => "memorymachine://history?date=2026-03-03"
 *
 * @example
 * buildMemoryMachineHistoryUrl("2026-03-03T14:00:00Z");
 * // => "memorymachine://history?date=2026-03-03T14%3A00%3A00Z"
 */
export function buildMemoryMachineHistoryUrl(date?: string) {
  const normalizedDate = (date ?? "").trim();
  if (!normalizedDate) {
    return "memorymachine://history";
  }

  return `memorymachine://history?${new URLSearchParams({ date: normalizedDate }).toString()}`;
}

/**
 * Returns the Memory Machine Settings deep link.
 *
 * @example
 * buildMemoryMachineSettingsUrl();
 * // => "memorymachine://settings"
 */
export function buildMemoryMachineSettingsUrl() {
  return "memorymachine://settings";
}

/**
 * Normalizes an ISO datetime string to UTC (`YYYY-MM-DDTHH:mm:ssZ`).
 *
 * This helper accepts an ISO datetime with either `Z` or an explicit offset,
 * then converts it to UTC at second precision.
 *
 * @example
 * normalizeHistoryTimestampUtc("2026-03-03T15:00:00+01:00");
 * // => "2026-03-03T14:00:00Z"
 *
 * @example
 * normalizeHistoryTimestampUtc("2026-03-03T14:00:00Z");
 * // => "2026-03-03T14:00:00Z"
 */
export function normalizeHistoryTimestampUtc(input: string) {
  const value = input.trim();
  if (!value) {
    throw new Error("Timestamp input cannot be empty");
  }

  if (!isIsoDateTimeWithOffset(value)) {
    throw new Error(
      "Timestamp must be an ISO datetime with timezone, e.g. 2026-03-03T14:00:00Z or 2026-03-03T15:00:00+01:00",
    );
  }

  // Check the calendar date before applying the offset, which can legitimately change the day.
  const calendarDate = value.slice(0, 10);
  const parsedCalendarDate = new Date(calendarDate).toJSON()?.slice(0, 10);
  const date = new Date(value);
  if (parsedCalendarDate !== calendarDate || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO timestamp: "${input}"`);
  }

  return formatUtcDateTime(date);
}

/**
 * Parses natural-language date/time input into Memory Machine History format.
 *
 * Returns:
 * - `YYYY-MM-DD` when the input has no explicit time
 * - `YYYY-MM-DDTHH:mm:ssZ` when the input includes a time (UTC-normalized)
 *
 * @example
 * resolveHistoryDateParam("yesterday");
 * // => "2026-03-03" (depending on current date)
 *
 * @example
 * resolveHistoryDateParam("yesterday at 3pm");
 * // => "2026-03-03T14:00:00Z" (example for Europe/Berlin)
 */
export function resolveHistoryDateParam(input: string, referenceDate: Date = new Date()) {
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
