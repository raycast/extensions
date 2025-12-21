import { format, fromUnixTime, isValid } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export interface ConversionResult {
  title: string;
  subtitle: string;
  value: string;
}

export interface ParsedDateInfo {
  date: Date;
  description: string;
}

/**
 * Parse search query and detect input type
 * @param query - The search query string
 * @param targetTimezone - Target timezone for interpretation
 * @returns ParsedDateInfo or null if invalid
 */
export function parseSearchQuery(
  query: string,
  targetTimezone: string,
): ParsedDateInfo | null {
  const now = new Date();
  let dateToDisplay: Date | null = null;
  let description = "";

  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    // Scenario A: Input is Empty
    return {
      date: now,
      description: "Current Time",
    };
  }

  if (/^\d+$/.test(trimmedQuery)) {
    // Scenario B: Input is Digits - Timestamp
    const timestamp = parseInt(trimmedQuery, 10);

    // Guessing s vs ms based on digits count
    // Unix timestamp in seconds for now is ~1.7e9 (10 digits).
    // Milliseconds is ~1.7e12 (13 digits).
    // Cutoff: 11 digits (e.g. 9999999999s is year 2286, reasonable).
    if (trimmedQuery.length <= 11) {
      dateToDisplay = fromUnixTime(timestamp);
      description = "From Unix Timestamp (s)";
    } else {
      dateToDisplay = fromUnixTime(timestamp / 1000);
      description = "From Unix Timestamp (ms)";
    }
  } else {
    // Scenario C: Input is Date String
    if (trimmedQuery.toLowerCase() === "now") {
      return {
        date: now,
        description: "Current Time",
      };
    }

    try {
      const parsed = new Date(trimmedQuery);
      if (isValid(parsed)) {
        // Check if query contains explicit timezone indicator (+, -, Z)
        const hasTimezone =
          /[Z+-]/.test(trimmedQuery) &&
          !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(trimmedQuery);

        if (hasTimezone) {
          dateToDisplay = parsed;
          description = "From Date String (Explicit Offset)";
        } else {
          // Interpret as local to target timezone
          dateToDisplay = fromZonedTime(trimmedQuery, targetTimezone);

          if (!isValid(dateToDisplay)) {
            // Fallback: parse and reinterpret
            const fallback = new Date(trimmedQuery);
            if (isValid(fallback)) {
              const isoLike = format(fallback, "yyyy-MM-dd HH:mm:ss");
              dateToDisplay = fromZonedTime(isoLike, targetTimezone);
              description = "From Date String (Assumed Target TZ)";
            }
          } else {
            description = "From Date String (Target TZ)";
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!dateToDisplay || !isValid(dateToDisplay)) {
    return null;
  }

  return {
    date: dateToDisplay,
    description,
  };
}

/**
 * Format a date into multiple output formats
 * @param date - The date to format
 * @param targetTimezone - Target timezone for formatting
 * @returns Array of ConversionResult
 */
export function formatDateResults(
  date: Date,
  targetTimezone: string,
): ConversionResult[] {
  const unixS = Math.floor(date.getTime() / 1000);
  const unixMs = date.getTime();

  const formattedDate = formatInTimeZone(
    date,
    targetTimezone,
    "yyyy-MM-dd HH:mm:ss",
  );
  const formattedDateFull = formatInTimeZone(
    date,
    targetTimezone,
    "yyyy-MM-dd HH:mm:ss.SSS zzz",
  );

  return [
    {
      title: formattedDate,
      subtitle: `Time in ${targetTimezone}`,
      value: formattedDate,
    },
    {
      title: String(unixS),
      subtitle: "Unix Timestamp (s)",
      value: String(unixS),
    },
    {
      title: String(unixMs),
      subtitle: "Unix Timestamp (ms)",
      value: String(unixMs),
    },
    {
      title: formattedDateFull,
      subtitle: "Full Format",
      value: formattedDateFull,
    },
  ];
}

/**
 * Main conversion function combining parsing and formatting
 * @param searchText - The search input text
 * @param targetTimezone - Target timezone
 * @returns Array of ConversionResult or empty array if invalid
 */
export function convertTimestamp(
  searchText: string,
  targetTimezone: string,
): ConversionResult[] {
  const parsed = parseSearchQuery(searchText, targetTimezone);

  if (!parsed) {
    return [];
  }

  return formatDateResults(parsed.date, targetTimezone);
}

/**
 * Detect the type of input
 * @param query - The input query string
 * @returns Input type: 'empty' | 'timestamp_s' | 'timestamp_ms' | 'date_string' | 'now'
 */
export function detectInputType(
  query: string,
): "empty" | "timestamp_s" | "timestamp_ms" | "date_string" | "now" {
  const trimmed = query.trim();

  if (!trimmed) {
    return "empty";
  }

  if (trimmed.toLowerCase() === "now") {
    return "now";
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed.length <= 11 ? "timestamp_s" : "timestamp_ms";
  }

  return "date_string";
}
