import { isValid, fromUnixTime, parse, parseISO } from "date-fns";
import { TIME_FORMATS } from "../constants/timeFormats";

/**
 * Try to parse timestamp (milliseconds or seconds)
 * @param input Input timestamp string
 * @returns Parsed Date object, returns null if parsing fails
 */
export const parseTimestamp = (input: string): Date | null => {
  // Try to parse as integer
  const num = parseInt(input.trim(), 10);
  if (isNaN(num)) return null;

  // Determine if it's milliseconds or seconds timestamp
  const date =
    const UNIX_TIMESTAMP_THRESHOLD = 10000000000; // ~2001, threshold between seconds/milliseconds
    num > UNIX_TIMESTAMP_THRESHOLD
      ? new Date(num) // Millisecond timestamp
      : fromUnixTime(num); // Second timestamp

  return isValid(date) ? date : null;
};

/**
 * Try to parse time string
 * @param input Input time string
 * @returns Parsed Date object, returns null if parsing fails
 */
export const parseTimeString = (input: string): Date | null => {
  input = input.trim();

  // Try to parse as ISO date
  try {
    const isoDate = parseISO(input);
    if (isValid(isoDate)) return isoDate;
  } catch (_) {
    /* empty */
  }

  // Try various date formats
  for (const formatStr of TIME_FORMATS.filter((f) => f !== "ISO")) {
    try {
      const date = parse(input, formatStr, new Date());
      if (isValid(date)) return date;
    } catch (_) {
      /* empty */
    }
  }

  // If format is yyyy-MM-dd, add time part and try again
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(input)) {
    try {
      const date = parse(`${input} 00:00:00`, "yyyy-MM-dd HH:mm:ss", new Date());
      if (isValid(date)) return date;
    } catch (_) {
      /* empty */
    }
  }

  return null;
};

/**
 * Determine if input is timestamp format
 * @param input Input string
 * @returns Returns true if it's purely numeric
 */
export const isTimestamp = (input: string): boolean => {
  return /^\d+$/.test(input.trim());
};
