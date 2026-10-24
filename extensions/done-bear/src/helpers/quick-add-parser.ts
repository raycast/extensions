import type { NavigableView } from "../api/types";
import { todayDateOnlyEpoch } from "./date-codecs";

export interface QuickAddTaskFields {
  deadlineAt?: number;
  startDate?: number;
  title: string;
  view: NavigableView;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_PATTERN = DAY_NAMES.join("|");
const DATE_PHRASE = `(?:today|tonight|tomorrow|next week|in \\d+ days?|(?:next\\s+|on\\s+)?(?:${DAY_PATTERN}))`;
const DEADLINE_PATTERN = new RegExp(
  `\\b(?:deadline(?:\\s+(?:by|on))?|due(?:\\s+(?:by|on))?|by)\\s+${DATE_PHRASE}\\b`,
  "gi",
);
const START_PATTERN = new RegExp(
  `\\b(?:today|tonight|tomorrow|next week|in \\d+ days?|next (?:${DAY_PATTERN})|on (?:${DAY_PATTERN})|inbox|anytime|someday)\\b`,
  "gi",
);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const addLocalDays = (date: Date, days: number): Date => {
  const resolved = new Date(date);
  resolved.setDate(resolved.getDate() + days);
  return resolved;
};

const dateOnlyEpoch = (date: Date): number => todayDateOnlyEpoch(date);

const dateForWeekday = (dayName: string, now: Date, requireFuture: boolean): number | undefined => {
  const targetDay = DAY_NAMES.indexOf(dayName.toLowerCase() as (typeof DAY_NAMES)[number]);
  if (targetDay < 0) {
    return undefined;
  }

  let daysUntil = targetDay - now.getDay();
  if (requireFuture ? daysUntil <= 0 : daysUntil < 0) {
    daysUntil += 7;
  }
  return dateOnlyEpoch(addLocalDays(now, daysUntil));
};

const parseNaturalDate = (value: string, now: Date, allowBareWeekday: boolean): number | undefined => {
  const text = normalizeWhitespace(value.toLowerCase());

  if (/\b(?:today|tonight)\b/.test(text)) {
    return dateOnlyEpoch(now);
  }
  if (/\btomorrow\b/.test(text)) {
    return dateOnlyEpoch(addLocalDays(now, 1));
  }
  if (/\bnext week\b/.test(text)) {
    return dateOnlyEpoch(addLocalDays(now, 7));
  }

  const daysMatch = text.match(/\bin (\d+) days?\b/);
  if (daysMatch) {
    return dateOnlyEpoch(addLocalDays(now, Number(daysMatch[1])));
  }

  const nextDayMatch = text.match(new RegExp(`\\bnext (${DAY_PATTERN})\\b`));
  if (nextDayMatch) {
    return dateForWeekday(nextDayMatch[1], now, true);
  }

  const onDayMatch = text.match(new RegExp(`\\bon (${DAY_PATTERN})\\b`));
  if (onDayMatch) {
    return dateForWeekday(onDayMatch[1], now, false);
  }

  if (allowBareWeekday) {
    const bareDayMatch = text.match(new RegExp(`^(${DAY_PATTERN})\\b`));
    if (bareDayMatch) {
      return dateForWeekday(bareDayMatch[1], now, false);
    }
  }

  return undefined;
};

const parseDeadline = (value: string, now: Date): number | undefined => {
  const match = value
    .toLowerCase()
    .match(new RegExp(`\\b(?:deadline(?:\\s+(?:by|on))?|due(?:\\s+(?:by|on))?|by)\\s+(${DATE_PHRASE})\\b`));
  return match ? parseNaturalDate(match[1], now, true) : undefined;
};

const cleanTitle = (value: string): string =>
  normalizeWhitespace(
    value
      .replace(/^\s*(?:add|create|remember to|remind me to|i need to|i have to|todo|to do)\s+/i, "")
      .replace(DEADLINE_PATTERN, "")
      .replace(START_PATTERN, "")
      .replace(/\bplease\b/gi, ""),
  ).replace(/^[\s,:-]+|[\s,:-]+$/g, "");

export const parseQuickAddTask = (
  value: string,
  now = new Date(),
  fallbackView: NavigableView = "inbox",
): QuickAddTaskFields => {
  const deadlineAt = parseDeadline(value, now);
  const startSearchText = value.replace(DEADLINE_PATTERN, "");
  const startDate = parseNaturalDate(startSearchText, now, false);
  const lower = value.toLowerCase();

  let view: NavigableView = fallbackView;
  if (/\banytime\b/.test(lower)) {
    view = "anytime";
  } else if (/\bsomeday\b/.test(lower)) {
    view = "someday";
  } else if (/\binbox\b/.test(lower)) {
    view = "inbox";
  } else if (/\b(?:today|tonight)\b/.test(startSearchText.toLowerCase())) {
    view = "today";
  } else if (startDate !== undefined) {
    view = "upcoming";
  }

  return {
    ...(deadlineAt === undefined ? {} : { deadlineAt }),
    ...(startDate === undefined ? {} : { startDate }),
    title: cleanTitle(value),
    view,
  };
};
