import type {
  ParsedAddZoneCommand,
  ParsedConversionQuery,
  ParsedQuery,
  ParsedRemoveZoneCommand,
} from "./types";
import { resolveTimezone } from "./aliases";

// Regex patterns matching Swift InputParser
// Pattern A: HH:MM [am/pm] ZONE — "11:30am PT", "15:00 BKK"
const PATTERN_A = /^(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|am|pm|a|p)?\s+(.+)$/i;

// Pattern B: HHMM [am/pm] ZONE — "1130am PT", "1500 BKK"
const PATTERN_B = /^(\d{2})(\d{2})\s*(a\.m\.|p\.m\.|am|pm|a|p)?\s+(.+)$/i;

// Pattern C: H am/pm ZONE — "3pm bangkok", "3 pm SF"
const PATTERN_C = /^(\d{1,2})\s*(a\.m\.|p\.m\.|am|pm|a|p)\s+(.+)$/i;

// Bare time used by "3pm in SF" and "11:30 in New York"
const BARE_TIME_WITH_COLON =
  /^(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|am|pm|a|p)?$/i;
const BARE_TIME_COMPACT = /^(\d{1,2})(\d{2})\s*(a\.m\.|p\.m\.|am|pm|a|p)?$/i;
const BARE_TIME_AMPM = /^(\d{1,2})\s*(a\.m\.|p\.m\.|am|pm|a|p)$/i;
const BARE_TIME_HOUR = /^(\d{1,2})$/;

function adjustHourForAmPm(hour: number, ampm: string | undefined): number {
  if (!ampm) return hour;
  const normalized = ampm.toLowerCase();
  const isPm = normalized.startsWith("p");
  const isAm = normalized.startsWith("a");
  if (isPm && hour < 12) return hour + 12;
  if (isAm && hour === 12) return 0;
  return hour;
}

function parseTime(input: string): ParsedConversionQuery | undefined {
  let match: RegExpMatchArray | null;

  // Pattern A: HH:MM [am/pm] ZONE
  match = input.match(PATTERN_A);
  if (match) {
    const hour = adjustHourForAmPm(parseInt(match[1]), match[3]);
    const minute = parseInt(match[2]);
    const zoneStr = match[4].trim();
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
    const tz = resolveTimezone(zoneStr);
    if (!tz) return undefined;
    return {
      kind: "conversion",
      hour,
      minute,
      sourceTimezone: tz,
      sourceLabel: zoneStr,
    };
  }

  // Pattern B: HHMM [am/pm] ZONE
  match = input.match(PATTERN_B);
  if (match) {
    const hour = adjustHourForAmPm(parseInt(match[1]), match[3]);
    const minute = parseInt(match[2]);
    const zoneStr = match[4].trim();
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
    const tz = resolveTimezone(zoneStr);
    if (!tz) return undefined;
    return {
      kind: "conversion",
      hour,
      minute,
      sourceTimezone: tz,
      sourceLabel: zoneStr,
    };
  }

  // Pattern C: H am/pm ZONE
  match = input.match(PATTERN_C);
  if (match) {
    const hour = adjustHourForAmPm(parseInt(match[1]), match[2]);
    const zoneStr = match[3].trim();
    if (hour < 0 || hour > 23) return undefined;
    const tz = resolveTimezone(zoneStr);
    if (!tz) return undefined;
    return {
      kind: "conversion",
      hour,
      minute: 0,
      sourceTimezone: tz,
      sourceLabel: zoneStr,
    };
  }

  return undefined;
}

function parseSpecialWord(input: string): ParsedConversionQuery | undefined {
  const parts = input.split(/\s+/, 2);
  if (parts.length !== 2) return undefined;

  let hour: number;
  const word = parts[0].toLowerCase();
  if (word === "noon") hour = 12;
  else if (word === "midnight") hour = 0;
  else return undefined;

  // The zone might have spaces (e.g., "new york"), so take everything after the first word
  const zoneStr = input.slice(parts[0].length).trim();
  const tz = resolveTimezone(zoneStr);
  if (!tz) return undefined;

  return {
    kind: "conversion",
    hour,
    minute: 0,
    sourceTimezone: tz,
    sourceLabel: zoneStr,
  };
}

function parseBareTime(
  input: string,
): Pick<ParsedConversionQuery, "hour" | "minute"> | undefined {
  let match = input.match(BARE_TIME_WITH_COLON);
  if (match) {
    const hour = adjustHourForAmPm(parseInt(match[1]), match[3]);
    const minute = parseInt(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
    return { hour, minute };
  }

  match = input.match(BARE_TIME_COMPACT);
  if (match) {
    const hour = adjustHourForAmPm(parseInt(match[1]), match[3]);
    const minute = parseInt(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
    return { hour, minute };
  }

  match = input.match(BARE_TIME_AMPM);
  if (match) {
    const hour = adjustHourForAmPm(parseInt(match[1]), match[2]);
    if (hour < 0 || hour > 23) return undefined;
    return { hour, minute: 0 };
  }

  match = input.match(BARE_TIME_HOUR);
  if (match) {
    const parsedHour = parseInt(match[1]);
    if (parsedHour < 0 || parsedHour > 24) return undefined;
    return { hour: parsedHour === 24 ? 0 : parsedHour, minute: 0 };
  }

  const word = input.toLowerCase();
  if (word === "noon") return { hour: 12, minute: 0 };
  if (word === "midnight") return { hour: 0, minute: 0 };

  return undefined;
}

function parseTimeInContext(input: string): ParsedConversionQuery | undefined {
  const inIndex = input.toLowerCase().indexOf(" in ");
  if (inIndex === -1) return undefined;

  const timePart = input.slice(0, inIndex).trim();
  const targetStr = input.slice(inIndex + 4).trim();
  if (!timePart || !targetStr) return undefined;

  const targetTz = resolveTimezone(targetStr);
  if (!targetTz) return undefined;

  const result = parseTime(timePart) || parseSpecialWord(timePart);
  if (!result) {
    const time = parseBareTime(timePart);
    if (!time) return undefined;

    return {
      kind: "conversion",
      ...time,
      sourceTimezone: targetTz,
      sourceLabel: targetStr,
    };
  }

  return {
    ...result,
    targetTimezone: targetTz,
    targetLabel: targetStr,
  };
}

export function parseTimeForZone(
  input: string,
  sourceLabel: string,
  sourceTimezone: string,
): ParsedConversionQuery | undefined {
  const time = parseBareTime(input.trim());
  if (!time) return undefined;

  return {
    kind: "conversion",
    ...time,
    sourceLabel,
    sourceTimezone,
  };
}

function parseCommand(
  input: string,
): ParsedAddZoneCommand | ParsedRemoveZoneCommand | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("+")) {
    const label = trimmed.slice(1).trim();
    if (!label) return undefined;
    const timezone = resolveTimezone(label);
    return timezone ? { kind: "addZone", label, timezone } : undefined;
  }

  if (trimmed.startsWith("-")) {
    const label = trimmed.slice(1).trim();
    return label ? { kind: "removeZone", label } : undefined;
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("add ")) {
    const label = trimmed.slice(4).trim();
    if (!label) return undefined;
    const timezone = resolveTimezone(label);
    return timezone ? { kind: "addZone", label, timezone } : undefined;
  }

  if (lower.startsWith("remove ")) {
    const label = trimmed.slice(7).trim();
    return label ? { kind: "removeZone", label } : undefined;
  }

  const timezone = resolveTimezone(trimmed);
  if (timezone) {
    return { kind: "addZone", label: trimmed, timezone };
  }

  return undefined;
}

/**
 * Parse a free-form timezone query into structured components.
 *
 * Supported formats:
 * - `3pm SF`, `11:30am PT`, `1130 BKK`, `15:00 NYC`
 * - `noon NYC`, `midnight CET`
 * - `1130am BKK in SF` (cross-zone)
 */
export function parseQuery(input: string): ParsedQuery | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const command = parseCommand(trimmed);
  if (command) return command;

  // Try "X in Y" syntax first
  const inContext = parseTimeInContext(trimmed);
  if (inContext) return inContext;

  // Try special words
  const special = parseSpecialWord(trimmed);
  if (special) return special;

  // Try time patterns
  return parseTime(trimmed);
}
