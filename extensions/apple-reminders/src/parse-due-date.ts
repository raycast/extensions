import * as chrono from "chrono-node";
import { addDays, addHours, addMinutes, addMonths, addWeeks, addYears, format } from "date-fns";

export type ParsedDueDate = {
  date: Date;
  isDateTime: boolean;
  matchedText: string;
};

type DurationUnit = "minute" | "hour" | "day" | "week" | "month" | "year";

const DURATION_UNITS = "hours?|hrs?|h|minutes?|mins?|months?|mos|mo|m|years?|yrs?|y|weeks?|wks?|w|days?|d";
const EXACT_DURATION_PATTERN = new RegExp(`^(?:in\\s+)?(\\d+)\\s*(${DURATION_UNITS})$`, "i");
const TRAILING_DURATION_PATTERN = new RegExp(`(?:^|\\s)(?:in\\s+)?(\\d+)\\s*(${DURATION_UNITS})$`, "i");
const IN_DURATION_PATTERN = new RegExp(`\\bin\\s+(\\d+)\\s*(${DURATION_UNITS})\\b`, "i");

export function parseDueDate(text: string, now: Date = new Date()): ParsedDueDate | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const durationMatch = trimmed.match(EXACT_DURATION_PATTERN);
  if (durationMatch) {
    return parsedDuration(durationMatch[0], durationMatch[1], durationMatch[2], now);
  }

  return parseChronoDate(trimmed, now);
}

export function extractDueDateFromText(text: string, now: Date = new Date()) {
  const durationMatch = text.match(TRAILING_DURATION_PATTERN) ?? text.match(IN_DURATION_PATTERN);
  if (durationMatch && durationMatch.index !== undefined) {
    return {
      title: stripMatchedText(text, durationMatch[0], durationMatch.index),
      dueDate: parsedDuration(durationMatch[0].trim(), durationMatch[1], durationMatch[2], now),
    };
  }

  const chronoMatch = chrono.parse(text, now)[0];
  if (chronoMatch) {
    return {
      title: stripMatchedText(text, chronoMatch.text, chronoMatch.index),
      dueDate: fromChrono(chronoMatch, now),
    };
  }

  return { title: text.replace(/\s+/g, " ").trim(), dueDate: null };
}

export function formatDueDate(parsed: ParsedDueDate): string {
  return parsed.isDateTime ? parsed.date.toISOString() : format(parsed.date, "yyyy-MM-dd");
}

function parseChronoDate(text: string, now: Date): ParsedDueDate | null {
  const chronoMatch = chrono.parse(text, now)[0];
  if (!chronoMatch) {
    return null;
  }

  return fromChrono(chronoMatch, now);
}

function fromChrono(match: chrono.ParsedResult, now: Date): ParsedDueDate {
  const chronoDate = match.start;
  const isDateTime = chronoDate.isCertain("hour") || chronoDate.isCertain("minute") || chronoDate.isCertain("second");
  let date = chronoDate.date();

  const hasExplicitDate =
    chronoDate.isCertain("weekday") ||
    chronoDate.isCertain("day") ||
    chronoDate.isCertain("month") ||
    chronoDate.isCertain("year");

  if (isDateTime && !hasExplicitDate && date.getTime() < now.getTime()) {
    date = addDays(date, 1);
  }

  return {
    date,
    isDateTime,
    matchedText: match.text,
  };
}

function parsedDuration(matchedText: string, amountText: string, unitText: string, now: Date): ParsedDueDate {
  const amount = Number.parseInt(amountText, 10);
  const unit = resolveDurationUnit(unitText);
  const isDateTime = unit === "minute" || unit === "hour";

  let date = now;
  switch (unit) {
    case "minute":
      date = addMinutes(now, amount);
      break;
    case "hour":
      date = addHours(now, amount);
      break;
    case "day":
      date = addDays(now, amount);
      break;
    case "week":
      date = addWeeks(now, amount);
      break;
    case "month":
      date = addMonths(now, amount);
      break;
    case "year":
      date = addYears(now, amount);
      break;
    default: {
      const exhaustive: never = unit;
      throw new Error(`Unhandled duration unit: ${exhaustive}`);
    }
  }

  return {
    date,
    isDateTime,
    matchedText: matchedText.trim(),
  };
}

function resolveDurationUnit(raw: string): DurationUnit {
  switch (raw.toLowerCase()) {
    case "h":
    case "hr":
    case "hrs":
    case "hour":
    case "hours":
      return "hour";
    case "m":
    case "min":
    case "mins":
    case "minute":
    case "minutes":
      return "minute";
    case "d":
    case "day":
    case "days":
      return "day";
    case "w":
    case "wk":
    case "wks":
    case "week":
    case "weeks":
      return "week";
    case "mo":
    case "mos":
    case "month":
    case "months":
      return "month";
    case "y":
    case "yr":
    case "yrs":
    case "year":
    case "years":
      return "year";
    default:
      throw new Error(`Unknown duration unit: ${raw}`);
  }
}

function stripMatchedText(text: string, matchedText: string, index: number): string {
  return `${text.slice(0, index)}${text.slice(index + matchedText.length)}`.replace(/\s+/g, " ").trim();
}
