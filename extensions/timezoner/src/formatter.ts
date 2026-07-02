type TimeFormat = "12h" | "24h";
type CopyFormat = "time-tz" | "24h-tz" | "time-city";

interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

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

function getLocalDateTimeParts(
  date: Date,
  timezone: string,
): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) => {
    const part = parts.find((candidate) => candidate.type === type);
    if (!part) throw new Error(`Missing ${type} for ${timezone}`);
    return parseInt(part.value, 10);
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function localPartsAsUtc(parts: LocalDateTimeParts): number {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
}

/**
 * Build a Date object for a given hour:minute in a specific timezone.
 *
 * Strategy: start with the anchor date's local calendar date in the target
 * timezone, then adjust the UTC guess until the full local date-time matches.
 */
export function buildReferenceDate(
  hour: number,
  minute: number,
  timezone: string,
  anchorDate: Date = new Date(),
): Date {
  const anchorParts = getLocalDateTimeParts(anchorDate, timezone);
  const desiredParts = {
    year: anchorParts.year,
    month: anchorParts.month,
    day: anchorParts.day,
    hour,
    minute,
  };
  const desiredLocalUtc = localPartsAsUtc(desiredParts);
  let guess = new Date(desiredLocalUtc);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actualParts = getLocalDateTimeParts(guess, timezone);
    const diffMinutes =
      (desiredLocalUtc - localPartsAsUtc(actualParts)) / 60_000;

    if (diffMinutes === 0) return guess;
    guess = new Date(guess.getTime() + diffMinutes * 60_000);
  }

  return guess;
}
