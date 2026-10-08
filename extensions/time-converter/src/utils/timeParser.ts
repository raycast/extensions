import { parse, set, isValid, addDays } from "date-fns";
import * as chrono from "chrono-node";
import { ParseResult } from "../types";

/**
 * Range separator pattern. Matches:
 *   -  (hyphen, with optional surrounding spaces)
 *   –  (en dash)
 *   —  (em dash)
 *   " to "
 *   " through "
 *   " until "
 *
 * Uses (?<=\w) so the hyphen is valid after any word character (e.g. the "m"
 * in "9pm"), not just digits. Requires the right side to start with a digit
 * so we don't accidentally split on hyphens inside words.
 */
const RANGE_SEPARATOR_RE =
  /\s*(?:–|—|\s+to\s+|\s+through\s+|\s+until\s+)\s*|(?<=\w)\s*-\s*(?=\d)/i;

/**
 * Natural language date-related keywords used to decide whether a parsed
 * result should include a full date in the output.
 */
const DATE_KEYWORD_RE =
  /\b(today|tomorrow|yesterday|next|last|ago|on|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|mon|tue|wed|thu|fri|sat|sun)\b/i;

/** Matches a 4-digit year anywhere in the input. */
const YEAR_RE = /\b\d{4}\b/;

/**
 * Parse a user-supplied time or time range string.
 *
 * Supports:
 * - Single times: "3pm", "15:30", "next Friday 2pm", "now", "noon", "midnight"
 * - Ranges: "1pm - 3pm", "1pm to 3pm", "11pm through 1am", "2pm until 4pm"
 *
 * For ranges, overnight detection is automatic: if the parsed end time is
 * earlier than the start time, one day is added to the end date.
 */
export function parseTimeInput(input: string): ParseResult {
  const trimmed = input.trim();
  const now = new Date();
  const includesDate = DATE_KEYWORD_RE.test(trimmed);
  const includesYear = YEAR_RE.test(trimmed);

  // ── Range detection ────────────────────────────────────────────────────────
  // Try chrono-node first — it natively parses "X to Y" style ranges and
  // returns a result with both .start and .end populated.
  const chronoResults = chrono.parse(trimmed);

  if (chronoResults.length > 0 && chronoResults[0].end) {
    const result = chronoResults[0];
    const startDate = result.start.date();
    let endDate = result.end!.date();

    if (endDate <= startDate) {
      endDate = addDays(endDate, 1);
    }

    return {
      date: startDate,
      endDate,
      includesDate,
      includesYear,
      isRange: true,
    };
  }

  // Try splitting on explicit separators (covers "1pm - 3pm" which chrono
  // may parse as two separate results rather than a range)
  const separatorMatch = trimmed.match(RANGE_SEPARATOR_RE);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const startStr = trimmed.slice(0, separatorMatch.index).trim();
    const endStr = trimmed
      .slice(separatorMatch.index + separatorMatch[0].length)
      .trim();

    if (startStr && endStr) {
      // If the full input contains a date keyword (e.g. "9pm - 11pm thursday"),
      // extract the date anchor from the full string and use it as the reference
      // for both sides so they land on the same day.
      let dateReference = now;
      if (includesDate) {
        const dateContext = chrono.parse(trimmed);
        if (dateContext.length > 0) {
          dateReference = dateContext[0].start.date();
        }
      }

      const startParsed = parseSingleTimeWithReference(startStr, dateReference);
      const endParsed = parseSingleTimeWithReference(endStr, dateReference);

      let endDate = endParsed.date;
      if (endDate <= startParsed.date) {
        endDate = addDays(endDate, 1);
      }

      return {
        date: startParsed.date,
        endDate,
        includesDate,
        includesYear,
        isRange: true,
      };
    }
  }

  // ── Single time ────────────────────────────────────────────────────────────
  return parseSingleTime(trimmed, includesDate, includesYear);
}

/**
 * Parse a single time/date string.
 */
function parseSingleTime(
  input: string,
  includesDate: boolean,
  includesYear: boolean,
): ParseResult & { isRange: false } {
  const now = new Date();
  const lowered = input.toLowerCase().trim();

  switch (lowered) {
    case "now":
      return {
        date: now,
        includesDate: true,
        includesYear: false,
        isRange: false,
      };
    case "noon":
      return {
        date: set(now, { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 }),
        includesDate: false,
        includesYear: false,
        isRange: false,
      };
    case "midnight":
      return {
        date: set(now, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }),
        includesDate: false,
        includesYear: false,
        isRange: false,
      };
  }

  const chronoParsed = chrono.parse(input);
  if (chronoParsed.length > 0) {
    return {
      date: chronoParsed[0].start.date(),
      includesDate,
      includesYear,
      isRange: false,
    };
  }

  return {
    date: parseFallback(input, now),
    includesDate: false,
    includesYear: false,
    isRange: false,
  };
}

/**
 * Parse the end half of a range using the start date as a reference so that
 * "next Friday 1pm - 3pm" correctly anchors 3pm to next Friday.
 */
function parseSingleTimeWithReference(
  input: string,
  reference: Date,
): ParseResult & { isRange: false } {
  const lowered = input.toLowerCase().trim();

  switch (lowered) {
    case "noon":
      return {
        date: set(reference, {
          hours: 12,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        }),
        includesDate: false,
        includesYear: false,
        isRange: false,
      };
    case "midnight":
      return {
        date: set(reference, {
          hours: 0,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        }),
        includesDate: false,
        includesYear: false,
        isRange: false,
      };
  }

  const chronoParsed = chrono.parse(input, reference);
  if (chronoParsed.length > 0) {
    return {
      date: chronoParsed[0].start.date(),
      includesDate: DATE_KEYWORD_RE.test(input),
      includesYear: YEAR_RE.test(input),
      isRange: false,
    };
  }

  return {
    date: parseFallback(input, reference),
    includesDate: false,
    includesYear: false,
    isRange: false,
  };
}

/**
 * Manual format parsing fallback for simple time strings.
 */
function parseFallback(input: string, reference: Date): Date {
  const lowered = input.toLowerCase().trim();

  if (lowered.includes("am") || lowered.includes("pm")) {
    let parsed = parse(input, "h:mm a", reference);
    if (isValid(parsed)) return parsed;

    parsed = parse(input, "h:mma", reference);
    if (isValid(parsed)) return parsed;

    parsed = parse(input, "ha", reference);
    if (isValid(parsed)) return parsed;

    parsed = parse(input, "h a", reference);
    if (isValid(parsed)) return parsed;
  }

  if (input.includes(":")) {
    const parsed = parse(input, "HH:mm", reference);
    if (isValid(parsed)) return parsed;
  }

  const parsed = parse(input, "H", reference);
  if (isValid(parsed)) return parsed;

  throw new Error(`Could not parse time: ${input}`);
}
