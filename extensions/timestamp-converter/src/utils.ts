import { format, formatDistanceToNow } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { zhCN } from "date-fns/locale";

export interface ConversionResult {
  title: string;
  value: string;
  subtitle?: string;
  accessory?: string;
}

/**
 * Detect if input is a timestamp (seconds or milliseconds)
 */
export function isTimestamp(input: string): boolean {
  const str = input.trim();

  // Must be pure digits (no spaces, no special characters)
  if (!/^\d+$/.test(str)) return false;

  const num = Number(str);
  if (isNaN(num)) return false;

  // Distinguish between seconds and milliseconds based on magnitude
  // If >= 10 digits, treat as milliseconds
  // Otherwise, treat as seconds
  return true;
}

/**
 * Normalize timestamp to milliseconds
 */
export function normalizeTimestamp(input: string | number): number {
  const num = typeof input === "string" ? Number(input) : input;

  // If 10 digits, it's seconds - convert to milliseconds
  if (num < 10000000000) {
    return num * 1000;
  }

  return num;
}

/**
 * Convert timestamp to Date object
 */
export function timestampToDate(timestamp: string | number): Date {
  const ms = normalizeTimestamp(timestamp);
  return new Date(ms);
}

/**
 * Parse datetime string to Date object
 */
export function parseDatetime(input: string): Date | null {
  try {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Format date in ISO 8601 format with timezone
 */
export function formatISO8601(date: Date, timezone: string): string {
  if (timezone === "local") {
    return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Format date in full format (YYYY-MM-DD HH:mm:ss)
 */
export function formatFull(date: Date, timezone: string): string {
  if (timezone === "local") {
    return format(date, "yyyy-MM-dd HH:mm:ss");
  }
  return formatInTimeZone(date, timezone, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Format date in localized format
 */
export function formatLocalized(date: Date, timezone: string, locale: "zh" | "en" = "en"): string {
  const formatStr = locale === "zh" ? "yyyy年MM月dd日 HH:mm:ss" : "PPpp";

  if (timezone === "local") {
    return format(date, formatStr, locale === "zh" ? { locale: zhCN } : undefined);
  }

  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, formatStr, locale === "zh" ? { locale: zhCN } : undefined);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelative(date: Date): string {
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Invalid date";
  }
}

/**
 * Get Unix timestamp in seconds
 */
export function getUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Get Unix timestamp in milliseconds
 */
export function getUnixMilliseconds(date: Date): number {
  return date.getTime();
}

/**
 * Get timezone display name
 */
export function getTimezoneDisplayName(timezone: string): string {
  if (timezone === "local") {
    return "Local Time";
  }

  const tzNames: Record<string, string> = {
    UTC: "UTC",
    "Asia/Shanghai": "Beijing Time (UTC+8)",
    "America/New_York": "Eastern Time",
    "America/Los_Angeles": "Pacific Time",
    "Europe/London": "London Time",
    "Asia/Tokyo": "Tokyo Time (UTC+9)",
    "Asia/Singapore": "Singapore Time (UTC+8)",
  };

  return tzNames[timezone] || timezone;
}

/**
 * Get all supported timezones
 */
export function getSupportedTimezones(): string[] {
  return [
    "local",
    "UTC",
    "Asia/Shanghai",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Asia/Tokyo",
    "Asia/Singapore",
  ];
}

/**
 * Convert timestamp/datetime to all formats
 */
export function convertToAllFormats(
  date: Date,
  primaryTimezone: string,
  showMultipleTimezones: boolean
): ConversionResult[] {
  const results: ConversionResult[] = [];

  // ISO 8601 Format
  results.push({
    title: "ISO 8601",
    value: formatISO8601(date, primaryTimezone),
    subtitle: getTimezoneDisplayName(primaryTimezone),
  });

  if (showMultipleTimezones && primaryTimezone !== "UTC") {
    results.push({
      title: "ISO 8601 (UTC)",
      value: formatISO8601(date, "UTC"),
      subtitle: "UTC",
    });
  }

  // Full Format
  results.push({
    title: "Full Format",
    value: formatFull(date, primaryTimezone),
    subtitle: getTimezoneDisplayName(primaryTimezone),
  });

  if (showMultipleTimezones && primaryTimezone !== "UTC") {
    results.push({
      title: "Full Format (UTC)",
      value: formatFull(date, "UTC"),
      subtitle: "UTC",
    });
  }

  // Localized Format
  results.push({
    title: "Localized",
    value: formatLocalized(date, primaryTimezone),
    subtitle: getTimezoneDisplayName(primaryTimezone),
  });

  // Unix Timestamp (seconds)
  results.push({
    title: "Unix Timestamp (seconds)",
    value: String(getUnixSeconds(date)),
    subtitle: "10 digits",
  });

  // Unix Timestamp (milliseconds)
  results.push({
    title: "Unix Timestamp (milliseconds)",
    value: String(getUnixMilliseconds(date)),
    subtitle: "13 digits",
  });

  // Relative Time
  results.push({
    title: "Relative Time",
    value: formatRelative(date),
    subtitle: "Human readable",
  });

  return results;
}
