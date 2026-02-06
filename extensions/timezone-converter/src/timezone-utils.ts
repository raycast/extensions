import { ABBREVIATION_MAP, CITY_MAP, SHORT_FORM_MAP, TIMEZONE_FULL_NAMES, isValidIana } from "./timezone-data";

// ── Types ──────────────────────────────────────────────────────

export interface ParsedQuery {
  timeStr: string;
  hours: number;
  minutes: number;
  sourceTimezone: string;
  sourceLabel: string;
  targetTimezone?: string;
  error?: string;
}

export interface ConvertedTime {
  ianaId: string;
  abbreviation: string;
  formattedTime: string;
  utcOffset: string;
  dayOffset: number;
  isLocal: boolean;
  label?: string;
  hours: number;
  minutes: number;
}

// ── Timezone Resolution ────────────────────────────────────────

/**
 * Resolve a user input string to one or more IANA timezone identifiers.
 * Returns an array because ambiguous abbreviations (IST, CST) map to multiple.
 */
export function resolveTimezone(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // 1. Exact IANA match (e.g., "Europe/Berlin")
  if (isValidIana(trimmed)) return [trimmed];

  // Also try with common casing: capitalize first letter of each segment
  const ianaGuess = trimmed
    .split("/")
    .map((part) =>
      part
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("_"),
    )
    .join("/");
  if (ianaGuess !== trimmed && isValidIana(ianaGuess)) return [ianaGuess];

  const lower = trimmed.toLowerCase();

  // 2. Short-form aliases (NY, LA, KL, etc.)
  if (SHORT_FORM_MAP[lower]) return [SHORT_FORM_MAP[lower]];

  // 3. Abbreviation lookup
  if (ABBREVIATION_MAP[lower]) return [...ABBREVIATION_MAP[lower]];

  // 4. City/region name — try greedy match (longest first)
  //    This handles multi-word city names like "New York" or "Kuala Lumpur"
  if (CITY_MAP[lower]) return [CITY_MAP[lower]];

  return [];
}

/**
 * Get a disambiguation label for a timezone when it comes from an ambiguous abbreviation.
 */
export function getDisambiguationLabel(ianaId: string, sourceLabel: string): string | undefined {
  const lower = sourceLabel.toLowerCase();
  const matches = ABBREVIATION_MAP[lower];
  if (!matches || matches.length <= 1) return undefined;
  return TIMEZONE_FULL_NAMES[ianaId] || ianaId;
}

// ── Query Parsing ──────────────────────────────────────────────

const TIME_RE = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i;
const TO_RE = /\bto\b/i;

export function parseQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      timeStr: "",
      hours: 0,
      minutes: 0,
      sourceTimezone: "",
      sourceLabel: "",
      error: "Empty query. Try something like: 7:22 CET or 7:22pm PST to CET",
    };
  }

  // 1. Extract time
  const timeMatch = trimmed.match(TIME_RE);
  if (!timeMatch) {
    return {
      timeStr: "",
      hours: 0,
      minutes: 0,
      sourceTimezone: "",
      sourceLabel: "",
      error: "Invalid time format. Use HH, HH:MM, or HH.MM, e.g., 11 CET, 7:22, or 7.22pm",
    };
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = timeMatch[3]?.toLowerCase();

  // Validate ranges
  if (ampm) {
    if (hours < 1 || hours > 12) {
      return {
        timeStr: timeMatch[0],
        hours,
        minutes,
        sourceTimezone: "",
        sourceLabel: "",
        error: "Invalid time: hour must be 1-12 when using AM/PM",
      };
    }
    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
  } else {
    if (hours > 23) {
      return {
        timeStr: timeMatch[0],
        hours,
        minutes,
        sourceTimezone: "",
        sourceLabel: "",
        error: "Invalid time: hour must be 0-23",
      };
    }
  }

  if (minutes > 59) {
    return {
      timeStr: timeMatch[0],
      hours,
      minutes,
      sourceTimezone: "",
      sourceLabel: "",
      error: "Invalid time: minutes must be 0-59",
    };
  }

  const timeStr = timeMatch[0].trim();
  const rest = trimmed.slice(timeMatch[0].length).trim();

  // 2. Split on "to" separator
  let sourcePart: string;
  let targetPart: string | undefined;

  const toMatch = rest.match(TO_RE);
  if (toMatch && toMatch.index !== undefined) {
    sourcePart = rest.slice(0, toMatch.index).trim();
    targetPart = rest.slice(toMatch.index + toMatch[0].length).trim();
  } else {
    sourcePart = rest;
  }

  if (!sourcePart) {
    return {
      timeStr,
      hours,
      minutes,
      sourceTimezone: "",
      sourceLabel: "",
      error: "Missing source timezone. Try: 7:22 CET",
    };
  }

  // 3. Resolve source timezone
  const sourceResolved = resolveTimezone(sourcePart);
  if (sourceResolved.length === 0) {
    return {
      timeStr,
      hours,
      minutes,
      sourceTimezone: "",
      sourceLabel: sourcePart,
      error: `Unknown timezone: "${sourcePart}". Try CET, Berlin, or Europe/Berlin`,
    };
  }

  // For ambiguous source, use the first match but pass all through
  const sourceTimezone = sourceResolved[0];

  // 4. Resolve target timezone (optional)
  let targetTimezone: string | undefined;
  if (targetPart) {
    const targetResolved = resolveTimezone(targetPart);
    if (targetResolved.length === 0) {
      return {
        timeStr,
        hours,
        minutes,
        sourceTimezone,
        sourceLabel: sourcePart,
        error: `Unknown target timezone: "${targetPart}". Try CET, Berlin, or Europe/Berlin`,
      };
    }
    targetTimezone = targetResolved[0];
  }

  return {
    timeStr,
    hours,
    minutes,
    sourceTimezone,
    sourceLabel: sourcePart,
    targetTimezone,
  };
}

// ── Time Conversion ────────────────────────────────────────────

/**
 * Get the UTC offset in minutes for a given IANA timezone at a specific date.
 */
function getUtcOffsetMinutes(ianaId: string, date: Date): number {
  // Format the date parts in UTC and in the target timezone, then compute the diff
  const utcParts = getDateParts(date, "UTC");
  const tzParts = getDateParts(date, ianaId);

  const utcMinutes =
    utcParts.year * 525960 + utcParts.month * 43800 + utcParts.day * 1440 + utcParts.hour * 60 + utcParts.minute;
  const tzMinutes =
    tzParts.year * 525960 + tzParts.month * 43800 + tzParts.day * 1440 + tzParts.hour * 60 + tzParts.minute;

  return tzMinutes - utcMinutes;
}

function getDateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return {
    year: parseInt(find(parts, "year"), 10),
    month: parseInt(find(parts, "month"), 10),
    day: parseInt(find(parts, "day"), 10),
    hour: parseInt(find(parts, "hour"), 10) % 24,
    minute: parseInt(find(parts, "minute"), 10),
  };
}

function find(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? "0";
}

/**
 * Format a UTC offset in minutes as a string like "+05:30" or "-08:00".
 */
function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Get the short timezone abbreviation (e.g., "EST", "CET") for a timezone at a specific time.
 */
function getAbbreviation(date: Date, ianaId: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaId,
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(date);
  return find(parts, "timeZoneName") || ianaId;
}

/**
 * Format a time using the system locale (respects 12h/24h preference).
 */
function formatTimeInTz(date: Date, ianaId: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: ianaId,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format numeric hours and minutes as "H:MM" (24h).
 */
export function formatTime(hours: number, minutes: number): string {
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Convert a time from a source timezone to a target timezone.
 */
export function convertTime(
  hours: number,
  minutes: number,
  sourceIana: string,
  targetIana: string,
  disambiguationLabel?: string,
): ConvertedTime {
  const localIana = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // 1. Create a reference date: today at the given time in UTC
  const now = new Date();
  const refDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0));

  // 2. Find the source timezone's UTC offset
  const sourceOffset = getUtcOffsetMinutes(sourceIana, refDate);

  // 3. The actual UTC time: the given time minus the source offset
  const actualUtcMs = refDate.getTime() - sourceOffset * 60_000;
  const actualUtcDate = new Date(actualUtcMs);

  // 4. Get target timezone offset and format
  const targetOffset = getUtcOffsetMinutes(targetIana, actualUtcDate);

  // 5. Determine day offset by comparing calendar dates in the source and target
  const sourceParts = getDateParts(actualUtcDate, sourceIana);
  const targetParts = getDateParts(actualUtcDate, targetIana);

  // Simple day diff (works for +-1 day scenarios)
  let dayOffset = targetParts.day - sourceParts.day;
  // Handle month boundary (e.g., source Jan 31, target Feb 1)
  if (dayOffset > 15) dayOffset -= 30; // target wrapped back
  if (dayOffset < -15) dayOffset += 30; // source wrapped back

  return {
    ianaId: targetIana,
    abbreviation: getAbbreviation(actualUtcDate, targetIana),
    formattedTime: formatTimeInTz(actualUtcDate, targetIana),
    utcOffset: formatUtcOffset(targetOffset),
    dayOffset,
    isLocal: targetIana === localIana,
    label: disambiguationLabel,
    hours: targetParts.hour,
    minutes: targetParts.minute,
  };
}

// ── Target Timezone Assembly ───────────────────────────────────

/**
 * Build the ordered list of target timezones for conversion.
 * Order: local, explicit target, favorites (deduplicated).
 */
export function getTargetTimezones(parsed: ParsedQuery, favoriteSetting: string): { ianaId: string; label?: string }[] {
  const localIana = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const seen = new Set<string>();
  const targets: { ianaId: string; label?: string }[] = [];

  function add(ianaId: string, label?: string) {
    if (seen.has(ianaId)) return;
    seen.add(ianaId);
    targets.push({ ianaId, label });
  }

  // 1. Local timezone always first
  add(localIana);

  // 2. Explicit target
  if (parsed.targetTimezone) {
    // Resolve again to handle ambiguous targets
    const targetResolved = resolveTimezone(parsed.targetTimezone);
    if (targetResolved.length === 0) {
      // Already validated in parseQuery, but just in case
      add(parsed.targetTimezone);
    } else {
      for (const tz of targetResolved) {
        // Use the raw targetTimezone string as-is since parseQuery already resolved it
        add(tz);
      }
    }
  }

  // 3. Favorites
  if (favoriteSetting.trim()) {
    const entries = favoriteSetting.split(",").map((s) => s.trim());
    for (const entry of entries) {
      if (!entry) continue;
      const resolved = resolveTimezone(entry);
      for (const tz of resolved) {
        add(tz);
      }
    }
  }

  return targets;
}

/**
 * Parse the favorite timezones preference and return invalid entries.
 */
export function getInvalidFavorites(favoriteSetting: string): string[] {
  if (!favoriteSetting.trim()) return [];
  const invalid: string[] = [];
  const entries = favoriteSetting.split(",").map((s) => s.trim());
  for (const entry of entries) {
    if (!entry) continue;
    if (resolveTimezone(entry).length === 0) {
      invalid.push(entry);
    }
  }
  return invalid;
}
