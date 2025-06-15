import { parse, set, isValid } from "date-fns";
import * as chrono from "chrono-node";

interface ParsedDateTime {
  date: Date;
  includesDate: boolean;
}

/**
 * Enhanced time and date input parsing with natural language support
 */
export function parseTimeInput(input: string): ParsedDateTime {
  const now = new Date();
  const lowered = input.toLowerCase().trim();

  // Handle special cases first
  switch (lowered) {
    case "now":
      return { date: now, includesDate: true };
    case "noon":
      return {
        date: set(now, { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 }),
        includesDate: false,
      };
    case "midnight":
      return {
        date: set(now, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }),
        includesDate: false,
      };
  }

  // Try parsing with chrono for natural language
  const chronoParsed = chrono.parse(input);
  if (chronoParsed.length > 0) {
    const result = chronoParsed[0];
    const parsedDate = result.start.date();
    // Check if the input actually contained date information
    const includesDate = input
      .toLowerCase()
      .match(
        /\b(today|tomorrow|yesterday|next|last|ago|on|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|mon|tue|wed|thu|fri|sat|sun)\b/,
      );

    return {
      date: parsedDate,
      includesDate: Boolean(includesDate),
    };
  }

  // Fallback to basic time parsing if no date component
  try {
    // Handle 12-hour format with AM/PM
    if (lowered.includes("am") || lowered.includes("pm")) {
      // Try with minutes
      let parsed = parse(input, "h:mma", now);
      if (isValid(parsed)) {
        return { date: parsed, includesDate: false };
      }

      // Try without minutes
      parsed = parse(input, "ha", now);
      if (isValid(parsed)) {
        return { date: parsed, includesDate: false };
      }
    }

    // Handle 24-hour format
    if (input.includes(":")) {
      const parsed = parse(input, "HH:mm", now);
      if (isValid(parsed)) {
        return { date: parsed, includesDate: false };
      }
    }

    // Handle hour-only input
    const parsed = parse(input, "H", now);
    if (isValid(parsed)) {
      return { date: parsed, includesDate: false };
    }

    throw new Error("Invalid time format");
  } catch (e) {
    console.error("An error occurred:", e);
    throw new Error(`Could not parse time: ${input}`);
  }
}
