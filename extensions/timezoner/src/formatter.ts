type TimeFormat = "12h" | "24h";
type CopyFormat = "time-tz" | "24h-tz" | "time-city";

/**
 * Format a time for display.
 * Uses Intl.DateTimeFormat — no external dependencies.
 */
export function formatTime(
  date: Date,
  timezone: string,
  format: TimeFormat,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: format === "12h",
  }).format(date);
}

/** Format a date for display (e.g., "Wed, Mar 25") */
export function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Get the timezone abbreviation (e.g., "PST", "EDT") */
function getTimezoneAbbr(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timezone;
}

/** Format a time for clipboard copy */
export function formatForCopy(
  date: Date,
  timezone: string,
  label: string,
  format: TimeFormat,
  copyFormat: CopyFormat,
): string {
  const abbr = getTimezoneAbbr(date, timezone);

  switch (copyFormat) {
    case "time-tz": {
      const time = formatTime(date, timezone, "12h");
      return `${time} ${abbr}`;
    }
    case "24h-tz": {
      const time = formatTime(date, timezone, "24h");
      return `${time} ${abbr}`;
    }
    case "time-city": {
      const time = formatTime(date, timezone, format);
      return `${time} (${label})`;
    }
  }
}

/** Format all zones for "Copy All" */
export function formatAllForCopy(
  date: Date,
  zones: Array<{ timezone: string; label: string }>,
  format: TimeFormat,
  copyFormat: CopyFormat,
): string {
  return zones
    .map((z) => formatForCopy(date, z.timezone, z.label, format, copyFormat))
    .join("\n");
}

/**
 * Build a Date object for a given hour:minute in a specific timezone.
 *
 * Strategy: start with today's date in the target timezone, then adjust
 * to get the desired local time.
 */
export function buildReferenceDate(
  hour: number,
  minute: number,
  timezone: string,
): Date {
  // Get today's date parts in the target timezone
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value);
  const day = parseInt(parts.find((p) => p.type === "day")!.value);

  // Create a UTC date, then adjust for timezone offset
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  // Get the actual local hour at that UTC time in the target timezone
  const actualLocal = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(utcGuess);

  const [actualH, actualM] = actualLocal.split(":").map(Number);

  // Calculate offset and adjust
  const diffMinutes = hour * 60 + minute - (actualH * 60 + actualM);
  return new Date(utcGuess.getTime() + diffMinutes * 60_000);
}
