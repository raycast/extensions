import { Action, ActionPanel, Icon, List, Toast, showToast, closeMainWindow, Keyboard } from "@raycast/api";
import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import Fuse from "fuse.js";
import { addYears, isPast, startOfDay, addHours, addMinutes, roundToNearestMinutes, format } from "date-fns";
import parseDuration from "parse-duration";
import Sherlock from "sherlockjs";
import { useGoogleAPIs, withGoogleAPIs } from "./lib/google";
import useCalendars from "./hooks/useCalendars";

// ============= Types =============

type EventType = "default" | "outOfOffice" | "focusTime";

interface QuickEvent {
  id: string;
  eventTitle: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  matchedCalendar?: string;
  matchedCalendarColor?: string;
  timezone?: string;
  eventType: EventType;
  durationMs?: number;
  recurrence?: string;
  recurrenceLabel?: string;
  recurrenceDayOfWeek?: number;
  location?: string;
  description?: string;
  urls?: string[];
  showAs?: "busy" | "free";
  attendees?: string[];
  alertMinutes?: number;
  apiLimitationWarning?: string; // Warning when API doesn't support requested feature
}

// ============= Timezone Handling =============

const TIMEZONE_OFFSETS: Record<string, number> = {
  // US timezones (full)
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  MST: -420,
  MDT: -360,
  PST: -480,
  PDT: -420,
  AKST: -540,
  AKDT: -480,
  HST: -600,
  // US timezones (short) - map to standard time
  ET: -300,
  CT: -360,
  MT: -420,
  PT: -480,
  // European
  GMT: 0,
  UTC: 0,
  WET: 0,
  WEST: 60,
  CET: 60,
  CEST: 120,
  EET: 120,
  EEST: 180,
  // Asia/Pacific
  IST: 330,
  JST: 540,
  AEST: 600,
  AEDT: 660,
  NZST: 720,
  NZDT: 780,
};

function extractTimezone(query: string): { query: string; timezone: string | null; offsetMinutes: number | null } {
  const tzList =
    "EST|EDT|CST|CDT|MST|MDT|PST|PDT|AKST|AKDT|HST|ET|CT|MT|PT|GMT|UTC|WET|WEST|CET|CEST|EET|EEST|IST|JST|AEST|AEDT|NZST|NZDT";

  // Match timezone after various time formats:
  // - "3pm PT", "3:30pm PT" (standard)
  // - "930 PT", "1030 PT" (bare 3-4 digit times)
  // - "9-930 PT", "9-10 PT" (time ranges)
  const timePatterns = [
    `\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)`, // 3pm, 3:30pm
    `\\d{3,4}`, // 930, 1030
    `\\d{1,2}\\s*-\\s*\\d{2,4}`, // 9-930, 9-10, 10-1030
  ];
  const tzPattern = new RegExp(`(?:${timePatterns.join("|")})\\s+(${tzList})\\b`, "gi");

  const match = query.match(tzPattern);
  if (match) {
    const fullMatch = match[0];
    const tzMatch = fullMatch.match(new RegExp(`(${tzList})$`, "i"));
    if (tzMatch) {
      const tz = tzMatch[1].toUpperCase();
      const offset = TIMEZONE_OFFSETS[tz];
      if (offset !== undefined) {
        const cleanedQuery = query.replace(new RegExp(`\\s+${tz}\\b`, "gi"), "");
        return { query: cleanedQuery, timezone: tz, offsetMinutes: offset };
      }
    }
  }
  return { query, timezone: null, offsetMinutes: null };
}

function applyTimezone(date: Date, offsetMinutes: number): Date {
  const localOffset = date.getTimezoneOffset();
  const diffMinutes = -offsetMinutes - localOffset;
  return new Date(date.getTime() + diffMinutes * 60 * 1000);
}

// ============= Duration Extraction =============

function extractDuration(query: string): { query: string; durationMs: number | null; isAllDay: boolean } {
  // First check for "all day" or "allday" as standalone keywords (not just =allday)
  const allDayPattern = /\b(all\s*day|allday)\b/i;
  if (allDayPattern.test(query)) {
    return {
      query: query.replace(allDayPattern, " ").replace(/\s+/g, " ").trim(),
      durationMs: null,
      isAllDay: true,
    };
  }

  // Match =30m, =1h, =2h30m, etc.
  const durationPattern = /\s*=\s*([\d]+[hm][\d]*[hm]?|[\d]+)\s*/gi;

  const match = query.match(durationPattern);
  if (match) {
    const durationStr = match[0]
      .replace(/^[\s=]+/, "")
      .trim()
      .toLowerCase();

    // Parse duration string (e.g., "30m", "1h", "2h30m")
    const ms = parseDuration(durationStr);
    if (ms && ms > 0) {
      return {
        query: query.replace(durationPattern, " ").trim(),
        durationMs: ms,
        isAllDay: false,
      };
    }
  }
  return { query, durationMs: null, isAllDay: false };
}

// ============= Event Type Extraction =============

const EVENT_TYPE_PATTERNS: { pattern: RegExp; type: EventType; label: string }[] = [
  // OOO patterns - must come before focus patterns
  { pattern: /\b(ooo|out\s+of\s+office|oof)\b/i, type: "outOfOffice", label: "OOO" },
  // Focus time patterns
  {
    pattern: /\b(focus\s+time|focustime|ft|focus|deep\s+work|deepwork|do\s+not\s+disturb|dnd)\b/i,
    type: "focusTime",
    label: "Focus",
  },
];

function extractEventType(query: string): { query: string; eventType: EventType; eventTypeLabel?: string } {
  for (const { pattern, type, label } of EVENT_TYPE_PATTERNS) {
    if (pattern.test(query)) {
      return {
        query: query.replace(pattern, "").replace(/\s+/g, " ").trim(),
        eventType: type,
        eventTypeLabel: label,
      };
    }
  }
  return { query, eventType: "default" };
}

// ============= Recurrence Extraction =============

interface RecurrenceResult {
  query: string;
  recurrence: string | null;
  recurrenceLabel?: string;
  dayOfWeek?: number; // 0=Sunday, 1=Monday, etc. - for adjusting start date
}

function extractRecurrence(query: string): RecurrenceResult {
  // Day name patterns
  const dayMap: Record<string, string> = {
    sunday: "SU",
    sun: "SU",
    monday: "MO",
    mon: "MO",
    tuesday: "TU",
    tue: "TU",
    tues: "TU",
    wednesday: "WE",
    wed: "WE",
    thursday: "TH",
    thu: "TH",
    thur: "TH",
    thurs: "TH",
    friday: "FR",
    fri: "FR",
    saturday: "SA",
    sat: "SA",
  };

  // Map day names to day of week numbers (0=Sunday)
  const dayNumMap: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  // Ordinal map for "every Nth [day]" patterns
  const ordinalMap: Record<string, number> = {
    first: 1,
    "1st": 1,
    second: 2,
    "2nd": 2,
    third: 3,
    "3rd": 3,
    fourth: 4,
    "4th": 4,
    fifth: 5,
    "5th": 5,
    last: -1,
  };

  // Every [ordinal] [day] pattern (e.g., "every third Thursday", "every last Friday")
  const everyOrdinalDayPattern =
    /\bevery\s+(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\s+(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i;
  const everyOrdinalDayMatch = query.match(everyOrdinalDayPattern);
  if (everyOrdinalDayMatch) {
    const ordinalStr = everyOrdinalDayMatch[1].toLowerCase();
    const dayName = everyOrdinalDayMatch[2].toLowerCase();
    const ordinal = ordinalMap[ordinalStr];
    const dayCode = dayMap[dayName] || dayMap[dayName.slice(0, 3)];
    const dayNum = dayNumMap[dayName] ?? dayNumMap[dayName.slice(0, 3)];
    if (dayCode && ordinal !== undefined) {
      const ordinalLabel = ordinalStr.charAt(0).toUpperCase() + ordinalStr.slice(1);
      const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return {
        query: query.replace(everyOrdinalDayPattern, "").replace(/\s+/g, " ").trim(),
        recurrence: `RRULE:FREQ=MONTHLY;BYDAY=${ordinal}${dayCode}`,
        recurrenceLabel: `${ordinalLabel} ${dayLabel}`,
        dayOfWeek: dayNum,
      };
    }
  }

  // Every [day] pattern (e.g., "every Monday", "every tue")
  const everyDayPattern =
    /\bevery\s+(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i;
  const everyDayMatch = query.match(everyDayPattern);
  if (everyDayMatch) {
    const dayName = everyDayMatch[1].toLowerCase();
    const dayCode = dayMap[dayName] || dayMap[dayName.slice(0, 3)];
    const dayNum = dayNumMap[dayName] ?? dayNumMap[dayName.slice(0, 3)];
    if (dayCode) {
      return {
        query: query.replace(everyDayPattern, "").replace(/\s+/g, " ").trim(),
        recurrence: `RRULE:FREQ=WEEKLY;BYDAY=${dayCode}`,
        recurrenceLabel: `Every ${everyDayMatch[1].charAt(0).toUpperCase() + everyDayMatch[1].slice(1).toLowerCase()}`,
        dayOfWeek: dayNum,
      };
    }
  }

  // Every weekday pattern
  const everyWeekdayPattern = /\bevery\s+weekday\b/i;
  if (everyWeekdayPattern.test(query)) {
    return {
      query: query.replace(everyWeekdayPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      recurrenceLabel: "Every weekday",
    };
  }

  // Every weekend pattern
  const everyWeekendPattern = /\bevery\s+weekend\b/i;
  if (everyWeekendPattern.test(query)) {
    return {
      query: query.replace(everyWeekendPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SA,SU",
      recurrenceLabel: "Every weekend",
    };
  }

  // Every morning/afternoon/evening (treat as daily, and inject the time)
  const everyTimeOfDayPattern = /\bevery\s+(morning|afternoon|evening|night)\b/i;
  const everyTimeMatch = query.match(everyTimeOfDayPattern);
  if (everyTimeMatch) {
    const timeOfDay = everyTimeMatch[1].toLowerCase();
    const timeMap: Record<string, string> = {
      morning: "9am",
      afternoon: "2pm",
      evening: "6pm",
      night: "8pm",
    };
    // Replace "every morning" with the time so it gets parsed
    const newQuery = query
      .replace(everyTimeOfDayPattern, timeMap[timeOfDay] || "")
      .replace(/\s+/g, " ")
      .trim();
    return {
      query: newQuery,
      recurrence: "RRULE:FREQ=DAILY",
      recurrenceLabel: "Daily",
    };
  }

  // Every day / daily pattern
  const dailyPattern = /\b(every\s+day|daily)\b/i;
  if (dailyPattern.test(query)) {
    return {
      query: query.replace(dailyPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=DAILY",
      recurrenceLabel: "Daily",
    };
  }

  // Every week / weekly pattern
  const weeklyPattern = /\b(every\s+week|weekly)\b/i;
  if (weeklyPattern.test(query)) {
    return {
      query: query.replace(weeklyPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=WEEKLY",
      recurrenceLabel: "Weekly",
    };
  }

  // Every month / monthly pattern
  const monthlyPattern = /\b(every\s+month|monthly)\b/i;
  if (monthlyPattern.test(query)) {
    return {
      query: query.replace(monthlyPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=MONTHLY",
      recurrenceLabel: "Monthly",
    };
  }

  // Every year / yearly / annually pattern
  const yearlyPattern = /\b(every\s+year|yearly|annually)\b/i;
  if (yearlyPattern.test(query)) {
    return {
      query: query.replace(yearlyPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=YEARLY",
      recurrenceLabel: "Yearly",
    };
  }

  return { query, recurrence: null };
}

// ============= Multi-day Date Range Extraction =============

interface DateRangeResult {
  query: string;
  startDate: Date | null;
  endDate: Date | null;
}

// Common separator pattern for date ranges
const DATE_RANGE_SEPARATORS = "\\s*(?:-|–|—|to|through|thru|until|til|till)\\s*";

function extractDateRange(query: string): DateRangeResult {
  const months =
    "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
  const days =
    "mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?";
  const relativeDates = "today|tomorrow|yesterday";
  const ordinals = "(?:st|nd|rd|th)?";

  // Pattern 1: Relative date through Month Day (e.g., "tomorrow through Jan 3rd", "today until Friday")
  // Using explicit pattern for better matching
  const relativeThroughMonthDayPattern =
    /\b(today|tomorrow|yesterday)\s+(?:through|thru|until|til|till|to|-|–|—)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const relativeThroughMonthDayMatch = query.match(relativeThroughMonthDayPattern);
  if (relativeThroughMonthDayMatch) {
    const relativeWord = relativeThroughMonthDayMatch[1].toLowerCase();
    const endMonth = parseMonth(relativeThroughMonthDayMatch[2]);
    const endDay = parseInt(relativeThroughMonthDayMatch[3], 10);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    if (relativeWord === "tomorrow") {
      startDate.setDate(now.getDate() + 1);
    } else if (relativeWord === "yesterday") {
      startDate.setDate(now.getDate() - 1);
    }

    let endYear = now.getFullYear();
    const endDate = new Date(endYear, endMonth, endDay);
    // If end date is before start, it's next year
    if (endDate < startDate) {
      endYear++;
      endDate.setFullYear(endYear);
    }
    endDate.setDate(endDate.getDate() + 1); // +1 for all-day end date

    return {
      query: query.replace(relativeThroughMonthDayPattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  // Pattern 2: Relative date through day of week (e.g., "today through Friday", "tomorrow until Sunday")
  const relativeThroughDayPattern = new RegExp(`\\b(${relativeDates})${DATE_RANGE_SEPARATORS}(${days})\\b`, "i");
  const relativeThroughDayMatch = query.match(relativeThroughDayPattern);
  if (relativeThroughDayMatch) {
    const relativeWord = relativeThroughDayMatch[1].toLowerCase();
    const endDayOfWeek = parseDayOfWeek(relativeThroughDayMatch[2]);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    if (relativeWord === "tomorrow") {
      startDate.setDate(now.getDate() + 1);
    } else if (relativeWord === "yesterday") {
      startDate.setDate(now.getDate() - 1);
    }

    // Find the next occurrence of end day after start
    const startDayOfWeek = startDate.getDay();
    let daysUntilEnd = endDayOfWeek - startDayOfWeek;
    if (daysUntilEnd <= 0) daysUntilEnd += 7;

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysUntilEnd + 1); // +1 for all-day end date

    return {
      query: query.replace(relativeThroughDayPattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  // Pattern 3: Same-month date range (e.g., "Feb 3-26", "Feb 3-26, 2027")
  // Must come before cross-month patterns to match "feb 3-26" before it's misinterpreted
  const sameMonthRangeWithYearPattern = new RegExp(
    `\\b(${months})\\s*(\\d{1,2})${ordinals}\\s*[-–—]\\s*(\\d{1,2})${ordinals}[,\\s]+(\\d{4})\\b`,
    "i",
  );
  const sameMonthWithYearMatch = query.match(sameMonthRangeWithYearPattern);
  if (sameMonthWithYearMatch) {
    const month = parseMonth(sameMonthWithYearMatch[1]);
    const startDay = parseInt(sameMonthWithYearMatch[2], 10);
    const endDay = parseInt(sameMonthWithYearMatch[3], 10);
    const year = parseInt(sameMonthWithYearMatch[4], 10);

    const startDate = new Date(year, month, startDay);
    const endDate = new Date(year, month, endDay + 1);

    return {
      query: query.replace(sameMonthRangeWithYearPattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  const sameMonthRangePattern = new RegExp(
    `\\b(${months})\\s*(\\d{1,2})${ordinals}\\s*[-–—]\\s*(\\d{1,2})${ordinals}\\b`,
    "i",
  );
  const sameMonthMatch = query.match(sameMonthRangePattern);
  if (sameMonthMatch) {
    const month = parseMonth(sameMonthMatch[1]);
    const startDay = parseInt(sameMonthMatch[2], 10);
    const endDay = parseInt(sameMonthMatch[3], 10);

    const now = new Date();
    let year = now.getFullYear();
    const startDate = new Date(year, month, startDay);
    if (startDate < now) {
      year++;
      startDate.setFullYear(year);
    }
    const endDate = new Date(year, month, endDay + 1);

    return {
      query: query.replace(sameMonthRangePattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  // Pattern 4a: Month day, year - Month day (e.g., "Dec 26, 2027 - Jan 3") - year on START date
  const monthDayRangeWithStartYearPattern = new RegExp(
    `\\b(${months})\\s*(\\d{1,2})${ordinals}[,\\s]+(\\d{4})${DATE_RANGE_SEPARATORS}(${months})\\s*(\\d{1,2})${ordinals}\\b`,
    "i",
  );
  const monthDayWithStartYearMatch = query.match(monthDayRangeWithStartYearPattern);
  if (monthDayWithStartYearMatch) {
    const startMonth = parseMonth(monthDayWithStartYearMatch[1]);
    const startDay = parseInt(monthDayWithStartYearMatch[2], 10);
    const specifiedYear = parseInt(monthDayWithStartYearMatch[3], 10);
    const endMonth = parseMonth(monthDayWithStartYearMatch[4]);
    const endDay = parseInt(monthDayWithStartYearMatch[5], 10);

    // Year was on start date - use it for start
    const startYear = specifiedYear;
    // End year is next year if end month < start month (e.g., Dec-Jan)
    const endYear = endMonth < startMonth ? specifiedYear + 1 : specifiedYear;

    const startDate = new Date(startYear, startMonth, startDay);
    const endDate = new Date(endYear, endMonth, endDay + 1);

    return {
      query: query.replace(monthDayRangeWithStartYearPattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  // Pattern 4b: Month day - Month day, year (e.g., "Dec 26 - Jan 3, 2027") - year on END date
  const monthDayRangeWithEndYearPattern = new RegExp(
    `\\b(${months})\\s*(\\d{1,2})${ordinals}${DATE_RANGE_SEPARATORS}(${months})\\s*(\\d{1,2})${ordinals}[,\\s]+(\\d{4})\\b`,
    "i",
  );
  const monthDayWithEndYearMatch = query.match(monthDayRangeWithEndYearPattern);
  if (monthDayWithEndYearMatch) {
    const startMonth = parseMonth(monthDayWithEndYearMatch[1]);
    const startDay = parseInt(monthDayWithEndYearMatch[2], 10);
    const endMonth = parseMonth(monthDayWithEndYearMatch[3]);
    const endDay = parseInt(monthDayWithEndYearMatch[4], 10);
    const specifiedYear = parseInt(monthDayWithEndYearMatch[5], 10);

    // Year was on end date - use it for end
    const endYear = specifiedYear;
    // Start year is previous year if start month > end month (e.g., Dec-Jan)
    const startYear = startMonth > endMonth ? specifiedYear - 1 : specifiedYear;

    const startDate = new Date(startYear, startMonth, startDay);
    const endDate = new Date(endYear, endMonth, endDay + 1);

    return {
      query: query.replace(monthDayRangeWithEndYearPattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  // Pattern 3b: Month day - Month day without year (e.g., "Dec 26 - Jan 2", "Dec 26-Jan2")
  const monthDayRangePattern = new RegExp(
    `\\b(${months})\\s*(\\d{1,2})${ordinals}${DATE_RANGE_SEPARATORS}(${months})\\s*(\\d{1,2})${ordinals}\\b`,
    "i",
  );
  const monthDayMatch = query.match(monthDayRangePattern);
  if (monthDayMatch) {
    const startMonth = parseMonth(monthDayMatch[1]);
    const startDay = parseInt(monthDayMatch[2], 10);
    const endMonth = parseMonth(monthDayMatch[3]);
    const endDay = parseInt(monthDayMatch[4], 10);

    const now = new Date();
    let startYear = now.getFullYear();
    let endYear = now.getFullYear();

    const startDate = new Date(startYear, startMonth, startDay);
    if (startDate < now) {
      startYear++;
      startDate.setFullYear(startYear);
    }

    if (endMonth < startMonth) {
      endYear = startYear + 1;
    } else {
      endYear = startYear;
    }

    const endDate = new Date(endYear, endMonth, endDay + 1);

    return {
      query: query.replace(monthDayRangePattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  // Pattern 4: Day - Day (e.g., "Monday - Friday", "Mon through Fri")
  const dayRangePattern = new RegExp(`\\b(${days})${DATE_RANGE_SEPARATORS}(${days})\\b`, "i");
  const dayRangeMatch = query.match(dayRangePattern);
  if (dayRangeMatch) {
    const startDayOfWeek = parseDayOfWeek(dayRangeMatch[1]);
    const endDayOfWeek = parseDayOfWeek(dayRangeMatch[2]);

    const now = new Date();
    const currentDay = now.getDay();

    let daysUntilStart = startDayOfWeek - currentDay;
    if (daysUntilStart <= 0) daysUntilStart += 7;

    const startDate = new Date(now);
    startDate.setDate(now.getDate() + daysUntilStart);
    startDate.setHours(0, 0, 0, 0);

    let daysUntilEnd = endDayOfWeek - startDayOfWeek;
    if (daysUntilEnd <= 0) daysUntilEnd += 7;

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysUntilEnd + 1);

    return {
      query: query.replace(dayRangePattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  // Pattern 5: "next week" as a date range (Monday through Friday)
  const nextWeekPattern = /\bnext\s+week\b/i;
  if (nextWeekPattern.test(query)) {
    const now = new Date();
    const currentDay = now.getDay();

    // Find next Monday
    let daysUntilMonday = 1 - currentDay;
    if (daysUntilMonday <= 0) daysUntilMonday += 7;

    const startDate = new Date(now);
    startDate.setDate(now.getDate() + daysUntilMonday);
    startDate.setHours(0, 0, 0, 0);

    // End on Saturday (day after Friday for all-day)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5);

    return {
      query: query.replace(nextWeekPattern, "").replace(/\s+/g, " ").trim(),
      startDate,
      endDate,
    };
  }

  return { query, startDate: null, endDate: null };
}

function parseMonth(monthStr: string): number {
  const months: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };
  return months[monthStr.toLowerCase()] ?? 0;
}

function parseDayOfWeek(dayStr: string): number {
  const days: Record<string, number> = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
  };
  const normalized = dayStr.toLowerCase().replace(/day$/, "");
  return days[normalized] ?? days[dayStr.toLowerCase()] ?? 0;
}

// ============= Location Extraction =============

function extractLocation(query: string): { query: string; location?: string } {
  // Match @(multi word location) or @single-word
  // Must be preceded by whitespace or start of string (not part of an email)
  // For parenthesized: @(Conference Room B)
  const parenPattern = /(?:^|\s)@\(([^)]+)\)/;
  const parenMatch = query.match(parenPattern);
  if (parenMatch) {
    return {
      query: query.replace(parenPattern, " ").replace(/\s+/g, " ").trim(),
      location: parenMatch[1],
    };
  }

  // For single word: @location (but not email-like patterns)
  // Ensure @ is not preceded by word characters (which would indicate email)
  const singlePattern = /(?:^|\s)@([a-zA-Z][\w-]*)\b(?![.@])/;
  const singleMatch = query.match(singlePattern);
  if (singleMatch) {
    return {
      query: query.replace(singlePattern, " ").replace(/\s+/g, " ").trim(),
      location: singleMatch[1],
    };
  }

  return { query };
}

// ============= Notes Extraction =============

function extractNotes(query: string): { query: string; description?: string } {
  // Match // followed by anything
  const notesPattern = /\s*\/\/\s*(.+)$/;
  const match = query.match(notesPattern);
  if (match) {
    return {
      query: query.replace(notesPattern, "").trim(),
      description: match[1].trim(),
    };
  }
  return { query };
}

// ============= URL Extraction =============

function extractUrls(query: string): { query: string; urls?: string[] } {
  // Match URLs (http/https)
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const matches = query.match(urlPattern);
  if (matches && matches.length > 0) {
    return {
      query: query.replace(urlPattern, "").replace(/\s+/g, " ").trim(),
      urls: matches,
    };
  }
  return { query };
}

// ============= Show As (Busy/Free) Extraction =============

function extractShowAs(query: string): { query: string; showAs?: "busy" | "free" } {
  // Using ~ prefix to avoid macOS text replacement (e.g., !fr → ₣)
  const busyPattern = /\s*~busy\b/i;
  const freePattern = /\s*~free\b/i;

  if (freePattern.test(query)) {
    return {
      query: query.replace(freePattern, "").replace(/\s+/g, " ").trim(),
      showAs: "free",
    };
  }
  if (busyPattern.test(query)) {
    return {
      query: query.replace(busyPattern, "").replace(/\s+/g, " ").trim(),
      showAs: "busy",
    };
  }
  return { query };
}

// ============= Attendees Extraction =============

function extractAttendees(query: string): { query: string; attendees?: string[] } {
  // Match "with email@domain.com" or "with email1@domain.com, email2@domain.com"
  const withPattern = /\s+with\s+([\w.+-]+@[\w.-]+(?:\s*,\s*[\w.+-]+@[\w.-]+)*)/gi;
  const matches: string[] = [];
  let match;

  while ((match = withPattern.exec(query)) !== null) {
    const emails = match[1].split(/\s*,\s*/);
    matches.push(...emails);
  }

  if (matches.length > 0) {
    return {
      query: query.replace(withPattern, "").replace(/\s+/g, " ").trim(),
      attendees: matches,
    };
  }
  return { query };
}

// ============= Alert/Reminder Extraction =============

function extractAlert(query: string): { query: string; alertMinutes?: number } {
  // Match "alert 15m", "alert 1h", "remind 30min", "reminder 1 hour", or shorthand "!15m", "!1h"
  const alertPattern = /\s*(?:alert|remind(?:er)?)\s+(\d+)\s*(m(?:in(?:ute)?s?)?|h(?:(?:ou)?rs?)?)\b/i;
  const shorthandPattern = /\s*!(\d+)\s*(m(?:in(?:ute)?s?)?|h(?:(?:ou)?rs?)?)\b/i;

  const match = query.match(alertPattern) || query.match(shorthandPattern);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const minutes = unit.startsWith("h") ? value * 60 : value;
    const patternUsed = query.match(alertPattern) ? alertPattern : shorthandPattern;
    return {
      query: query.replace(patternUsed, "").replace(/\s+/g, " ").trim(),
      alertMinutes: minutes,
    };
  }
  return { query };
}

// ============= "For X" Duration Extraction =============

function extractForDuration(query: string): { query: string; durationMs?: number } {
  // Match "for 30 minutes", "for 1 hour", "for 2h", "for 90min"
  const forPattern = /\s+for\s+(\d+)\s*(m(?:in(?:ute)?s?)?|h(?:(?:ou)?rs?)?)\b/i;
  const match = query.match(forPattern);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const ms = unit.startsWith("h") ? value * 60 * 60 * 1000 : value * 60 * 1000;
    return {
      query: query.replace(forPattern, "").replace(/\s+/g, " ").trim(),
      durationMs: ms,
    };
  }
  return { query };
}

// ============= Time Keywords =============

function expandTimeKeywords(query: string): string {
  // Replace time-of-day keywords with specific times
  const replacements: [RegExp, string][] = [
    [/\bmorning\b/gi, "9am"],
    [/\bnoon\b/gi, "12pm"],
    [/\bafternoon\b/gi, "2pm"],
    [/\bevening\b/gi, "6pm"],
    [/\bnight\b/gi, "8pm"],
    [/\bmidnight\b/gi, "12am"],
    [/\btmrw\b/gi, "tomorrow"],
    [/\btom\b/gi, "tomorrow"],
  ];

  for (const [pattern, replacement] of replacements) {
    query = query.replace(pattern, replacement);
  }
  return query;
}

// ============= Extended Recurrence =============

function extractExtendedRecurrence(query: string): { query: string; recurrence?: string; recurrenceLabel?: string } {
  // "every other week" / "biweekly" / "every 2 weeks"
  const everyOtherWeekPattern = /\b(?:every\s+other\s+week|biweekly|every\s+2\s+weeks?)\b/i;
  if (everyOtherWeekPattern.test(query)) {
    return {
      query: query.replace(everyOtherWeekPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=WEEKLY;INTERVAL=2",
      recurrenceLabel: "Every 2 weeks",
    };
  }

  // "every other day"
  const everyOtherDayPattern = /\bevery\s+other\s+day\b/i;
  if (everyOtherDayPattern.test(query)) {
    return {
      query: query.replace(everyOtherDayPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: "RRULE:FREQ=DAILY;INTERVAL=2",
      recurrenceLabel: "Every 2 days",
    };
  }

  // "every N weeks/days/months"
  const everyNPattern = /\bevery\s+(\d+)\s+(day|week|month)s?\b/i;
  const everyNMatch = query.match(everyNPattern);
  if (everyNMatch) {
    const interval = parseInt(everyNMatch[1], 10);
    const unit = everyNMatch[2].toUpperCase();
    const freq = unit === "DAY" ? "DAILY" : unit === "WEEK" ? "WEEKLY" : "MONTHLY";
    return {
      query: query.replace(everyNPattern, "").replace(/\s+/g, " ").trim(),
      recurrence: `RRULE:FREQ=${freq};INTERVAL=${interval}`,
      recurrenceLabel: `Every ${interval} ${everyNMatch[2].toLowerCase()}${interval > 1 ? "s" : ""}`,
    };
  }

  return { query };
}

// ============= Date Helpers =============

function adjustPastDate(date: Date, isAllDay: boolean): Date {
  const now = new Date();
  const compareDate = isAllDay ? startOfDay(date) : date;
  const compareNow = isAllDay ? startOfDay(now) : now;

  if (isPast(compareDate) && compareDate < compareNow) {
    return addYears(date, 1);
  }
  return date;
}

function getDefaultStartDate(): Date {
  const startDate = addMinutes(new Date(), 15);
  return roundToNearestMinutes(startDate, { nearestTo: 30 });
}

function getDefaultEndDate(startDate: Date): Date {
  return addHours(startDate, 1);
}

function preprocessQuery(query: string): string {
  // Protect common meeting patterns from being parsed as times
  // Replace with placeholder that won't be parsed, then we'll handle in title
  const meetingPatterns = [
    { pattern: /\b1-on-1s?\b/gi, replacement: "ONE_ON_ONE_MEETING" },
    { pattern: /\b1:1s?\b/gi, replacement: "ONE_ON_ONE_MEETING" },
    { pattern: /\bone-on-ones?\b/gi, replacement: "ONE_ON_ONE_MEETING" },
  ];
  for (const { pattern, replacement } of meetingPatterns) {
    query = query.replace(pattern, replacement);
  }

  // Convert time ranges like "2-3pm" to "from 2pm to 3pm"
  const timeRangePattern = /\b(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/gi;
  query = query.replace(timeRangePattern, (_, start, end, ampm) => {
    return `from ${start}${ampm} to ${end}${ampm}`;
  });

  // Handle "2pm-3pm" format
  const timeRangeWithBothPattern = /\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/gi;
  query = query.replace(timeRangeWithBothPattern, (_, start, ampm1, end, ampm2) => {
    return `from ${start}${ampm1} to ${end}${ampm2}`;
  });

  // Handle bare time ranges without am/pm like "9-930", "9-10", "10-1030"
  // Convert 3-4 digit numbers to time format (930 → 9:30, 1030 → 10:30)
  const bareTimeRangePattern = /\b(\d{1,2})\s*-\s*(\d{3,4})\b/g;
  query = query.replace(bareTimeRangePattern, (match, startHour, endTime) => {
    // Don't match if it looks like a year range (e.g., 2020-2025)
    if (parseInt(startHour, 10) >= 19 || parseInt(endTime, 10) >= 1300) return match;

    // Convert endTime: 930 → 9:30, 1030 → 10:30
    const endStr =
      endTime.length === 3 ? `${endTime[0]}:${endTime.slice(1)}` : `${endTime.slice(0, 2)}:${endTime.slice(2)}`;

    // Determine am/pm - hours 1-4 default to PM (rare to have meetings at 1-4am)
    // Hours 5-11 default to AM, 12 defaults to PM
    const startH = parseInt(startHour, 10);
    const ampm = startH >= 5 && startH < 12 ? "am" : "pm";

    return `from ${startHour}${ampm} to ${endStr}${ampm}`;
  });

  // Handle simple hour ranges without am/pm like "9-10" (not caught by above)
  const simpleHourRangePattern = /\b(\d{1,2})\s*-\s*(\d{1,2})(?!\d|:|am|pm|h)\b/gi;
  query = query.replace(simpleHourRangePattern, (match, startHour, endHour) => {
    const start = parseInt(startHour, 10);
    const end = parseInt(endHour, 10);
    // Don't match if numbers are too large or if end < start (likely not a time)
    if (start > 12 || end > 12 || start === 0) return match;
    // Hours 1-4 default to PM (rare to have meetings at 1-4am), 5-11 default to AM
    const ampm = start >= 5 && start < 12 ? "am" : "pm";
    return `from ${startHour}${ampm} to ${endHour}${ampm}`;
  });

  // EU time formats (14h, 14h30) - only valid hours 0-23
  // Use specific patterns to avoid matching invalid hours like 25h
  const timePattern = /\b(([01]?\d|2[0-3])([uUhH])(\d{2})?)\b/g;
  query = query.replace(timePattern, (match, _full, hour, _sep, minutes) => {
    const h = parseInt(hour, 10);
    const m = minutes ? parseInt(minutes, 10) : 0;
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return format(date, "h:mm aa");
  });

  // Remove invalid EU-like patterns (e.g., 25h, 30h) so Sherlock doesn't misparse them as dates
  // These get kept in the title since we do this after EU time conversion
  query = query.replace(/\b([3-9]\d|2[4-9])h\b/gi, "");

  return query;
}

// ============= Calendar Matching =============

function matchCalendar(calendarInput: string, calendarNames: string[]): string | undefined {
  if (!calendarInput || calendarNames.length === 0) {
    return undefined;
  }

  const normalizedInput = calendarInput.toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = calendarNames.find((cal) => cal.toLowerCase() === normalizedInput);
  if (exactMatch) {
    return exactMatch;
  }

  // Prefix match
  const prefixMatches = calendarNames.filter((cal) => cal.toLowerCase().startsWith(normalizedInput));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  // Fuzzy match
  const fuse = new Fuse(calendarNames, { threshold: 0.4, ignoreLocation: true });
  const fuseResults = fuse.search(calendarInput);
  if (fuseResults.length > 0) {
    return fuseResults[0].item;
  }

  return undefined;
}

// ============= Date Formatting =============

function formatRelativeDay(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((startOfDay(date).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24));

  switch (diffDays) {
    case -1:
      return "yesterday";
    case 0:
      return "today";
    case 1:
      return "tomorrow";
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      return format(date, "EEEE");
    default:
      return format(date, "MMM d, yyyy");
  }
}

function formatEventDate(event: QuickEvent): string {
  // Check if it's a multi-day event
  const startDay = startOfDay(event.startDate);
  const endDay = startOfDay(event.endDate);
  const daysDiff = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));

  if (event.isAllDay && daysDiff > 1) {
    // Multi-day all-day event
    const actualEndDate = new Date(event.endDate.getTime() - 86400000);
    const startYear = event.startDate.getFullYear();
    const endYear = actualEndDate.getFullYear();
    const currentYear = new Date().getFullYear();

    // Show years if crossing years or if not the current year
    const showYears = startYear !== endYear || startYear !== currentYear;

    // Build format with day names - use short day (EEE = Mon, Tue, etc.)
    const startDayName = format(event.startDate, "EEE");
    const endDayName = format(actualEndDate, "EEE");
    const startDateStr = format(event.startDate, showYears ? "MMM d, yyyy" : "MMM d");
    const endDateStr = format(actualEndDate, showYears ? "MMM d, yyyy" : "MMM d");

    // Include both day names if not too long, otherwise just start day
    const fullFormat = `${startDayName}, ${startDateStr} - ${endDayName}, ${endDateStr} (${daysDiff} days)`;
    const shortFormat = `${startDayName}, ${startDateStr} - ${endDateStr} (${daysDiff} days)`;

    // Use full format if under ~55 chars, otherwise use short format
    return fullFormat.length <= 55 ? fullFormat : shortFormat;
  }
  if (event.isAllDay) {
    return `${formatRelativeDay(event.startDate)} all-day`;
  }
  return `${formatRelativeDay(event.startDate)} from ${format(event.startDate, "h:mm a")} to ${format(event.endDate, "h:mm a")}`;
}

// ============= Main Component =============

function QuickCreateEvent() {
  const { calendar } = useGoogleAPIs();
  const { data: calendarsData, isLoading: isLoadingCalendars } = useCalendars();
  const [searchText, setSearchText] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Get calendar names and ID mapping
  // Include calendars where user has write access (owner or writer)
  const calendars = useMemo(() => {
    const all = [...calendarsData.selected, ...calendarsData.unselected].filter(
      (cal) => cal.accessRole === "owner" || cal.accessRole === "writer",
    );
    return all.map((cal) => ({
      id: cal.primary ? "primary" : cal.id!,
      name: cal.summaryOverride ?? cal.summary ?? "Unknown",
      color: cal.backgroundColor ?? undefined,
    }));
  }, [calendarsData]);

  const calendarNames = useMemo(() => calendars.map((c) => c.name), [calendars]);

  // Parse the input
  const parsedEvent = useMemo((): (QuickEvent & { eventTypeLabel?: string }) | null => {
    if (!searchText.trim()) return null;

    let query = searchText;

    // Extract notes first (// at end)
    const { query: queryWithoutNotes, description } = extractNotes(query);
    query = queryWithoutNotes;

    // Extract calendar selector (/work, /personal, etc.)
    let matchedCalendar: string | undefined;
    let matchedCalendarColor: string | undefined;
    const calendarMatch = query.match(/\s\/([^\s/]+)\s*$/);
    if (calendarMatch) {
      const calendarInput = calendarMatch[1];
      matchedCalendar = matchCalendar(calendarInput, calendarNames);
      if (matchedCalendar) {
        const cal = calendars.find((c) => c.name === matchedCalendar);
        matchedCalendarColor = cal?.color;
      }
      query = query.slice(0, calendarMatch.index).trim();
    }

    // Extract URLs
    const { query: queryWithoutUrls, urls } = extractUrls(query);
    query = queryWithoutUrls;

    // Extract attendees BEFORE location (to avoid matching email domains as locations)
    const { query: queryWithoutAttendees, attendees } = extractAttendees(query);
    query = queryWithoutAttendees;

    // Extract location (@location)
    const { query: queryWithoutLocation, location } = extractLocation(query);
    query = queryWithoutLocation;

    // Extract show as (!free, !busy)
    const { query: queryWithoutShowAs, showAs } = extractShowAs(query);
    query = queryWithoutShowAs;

    // Extract alert/reminder
    const { query: queryWithoutAlert, alertMinutes } = extractAlert(query);
    query = queryWithoutAlert;

    // Extract duration (=30m, =1h, =allday)
    const { query: queryWithoutDuration, durationMs, isAllDay: durationIsAllDay } = extractDuration(query);
    query = queryWithoutDuration;

    // Extract "for X" duration (for 30 min, for 1 hour)
    const { query: queryWithoutForDuration, durationMs: forDurationMs } = extractForDuration(query);
    query = queryWithoutForDuration;
    const finalDurationMs = durationMs ?? forDurationMs;

    // Extract event type (OOO, focus time, etc.)
    const {
      query: queryWithoutEventType,
      eventType: rawEventType,
      eventTypeLabel: rawEventTypeLabel,
    } = extractEventType(query);
    query = queryWithoutEventType;

    // Extract recurrence (every day, every Monday, weekly, etc.)
    const {
      query: queryWithoutRecurrence,
      recurrence,
      recurrenceLabel,
      dayOfWeek: recurrenceDayOfWeek,
    } = extractRecurrence(query);
    query = queryWithoutRecurrence;

    // Extract multi-day date range (Dec 26 - Jan 2, Mon-Fri, etc.)
    const { query: queryWithoutDateRange, startDate: rangeStart, endDate: rangeEnd } = extractDateRange(query);
    query = queryWithoutDateRange;

    // Extract timezone
    const { query: queryWithoutTz, timezone, offsetMinutes } = extractTimezone(query);
    query = queryWithoutTz;

    // Preprocess: expand time keywords and handle time formats
    let preprocessed = expandTimeKeywords(query);
    preprocessed = preprocessQuery(preprocessed);
    const parsed = Sherlock.parse(preprocessed);

    // Use date range if found, otherwise use Sherlock parsed dates
    let startDate = rangeStart ?? parsed.startDate ?? getDefaultStartDate();
    let endDate = rangeEnd ?? parsed.endDate ?? getDefaultEndDate(startDate);
    let isAllDay = rangeStart !== null || durationIsAllDay || parsed.isAllDay;

    // Handle overnight time ranges (e.g., 9pm-2am means 2am is next day)
    if (!isAllDay && endDate <= startDate && parsed.endDate) {
      // End time is before or equal to start time, assume it's the next day
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Apply duration if specified (overrides parsed end date, but not date range)
    const effectiveDurationMs = finalDurationMs ?? (durationMs || undefined);
    if (effectiveDurationMs && !rangeStart) {
      endDate = new Date(startDate.getTime() + effectiveDurationMs);
      isAllDay = false;
    }

    // Apply timezone (not for all-day events)
    if (offsetMinutes !== null && !isAllDay) {
      startDate = applyTimezone(startDate, offsetMinutes);
      endDate = applyTimezone(endDate, offsetMinutes);
    }

    // Adjust past dates (but not if we have a date range or explicit "yesterday")
    const hasExplicitPastDate = /\byesterday\b/i.test(searchText);
    if (!rangeStart && !hasExplicitPastDate) {
      const originalStart = startDate;
      startDate = adjustPastDate(startDate, isAllDay);
      if (startDate.getTime() !== originalStart.getTime()) {
        endDate = addYears(endDate, 1);
      }
    }

    // Also check for extended recurrence patterns (every other week, biweekly, etc.)
    let finalRecurrence = recurrence;
    let finalRecurrenceLabel = recurrenceLabel;
    const finalRecurrenceDayOfWeek = recurrenceDayOfWeek;
    if (!finalRecurrence) {
      const extendedResult = extractExtendedRecurrence(query);
      if (extendedResult.recurrence) {
        finalRecurrence = extendedResult.recurrence;
        finalRecurrenceLabel = extendedResult.recurrenceLabel;
      }
    }

    // If we have a specific day of week from recurrence (e.g., "every Tuesday"),
    // adjust the start date to the next occurrence of that day
    if (finalRecurrenceDayOfWeek !== undefined && !rangeStart) {
      const currentDayOfWeek = startDate.getDay();
      let daysToAdd = finalRecurrenceDayOfWeek - currentDayOfWeek;
      if (daysToAdd < 0) daysToAdd += 7;
      if (daysToAdd === 0 && startDate < new Date()) daysToAdd = 7; // If it's today but past, go to next week

      if (daysToAdd > 0) {
        const duration = endDate.getTime() - startDate.getTime();
        startDate = new Date(startDate);
        startDate.setDate(startDate.getDate() + daysToAdd);
        endDate = new Date(startDate.getTime() + duration);
      }
    }

    // Google Calendar API doesn't support recurring OOO/Focus Time events
    // Convert them to regular events when recurrence is specified
    let eventType = rawEventType;
    let eventTypeLabel = rawEventTypeLabel;
    // Restore protected patterns in title (e.g., ONE_ON_ONE_MEETING -> 1-on-1)
    let eventTitle = parsed.eventTitle?.replace(/ONE_ON_ONE_MEETING/g, "1-on-1") ?? null;
    let apiLimitationWarning: string | undefined;

    if (finalRecurrence && (rawEventType === "outOfOffice" || rawEventType === "focusTime")) {
      eventType = "default";
      eventTypeLabel = undefined;
      // Preserve a meaningful title when converting from OOO/Focus
      if (!eventTitle) {
        eventTitle = rawEventType === "outOfOffice" ? "Out of office" : "Focus time";
      }
      // Add warning about API limitation
      const typeName = rawEventType === "outOfOffice" ? "OOO" : "Focus Time";
      apiLimitationWarning = `Recurring ${typeName} not supported by API`;
    }

    return {
      id: nanoid(),
      eventTitle,
      startDate,
      endDate,
      isAllDay,
      matchedCalendar,
      matchedCalendarColor,
      timezone: timezone ?? undefined,
      eventType,
      eventTypeLabel,
      durationMs: effectiveDurationMs,
      recurrence: finalRecurrence ?? undefined,
      recurrenceLabel: finalRecurrenceLabel,
      recurrenceDayOfWeek: finalRecurrenceDayOfWeek,
      location,
      description,
      urls,
      showAs,
      attendees,
      alertMinutes,
      apiLimitationWarning,
    };
  }, [searchText, calendarNames, calendars]);

  // Get ordered calendars (matched first)
  const orderedCalendars = useMemo(() => {
    if (!parsedEvent?.matchedCalendar) {
      return calendars;
    }
    const matched = calendars.find((c) => c.name === parsedEvent.matchedCalendar);
    if (!matched) return calendars;
    return [matched, ...calendars.filter((c) => c.id !== matched.id)];
  }, [calendars, parsedEvent?.matchedCalendar]);

  // Create event
  const createEvent = async (event: QuickEvent & { eventTypeLabel?: string }, calendarId: string) => {
    setIsCreating(true);
    try {
      const eventTypeLabels: Record<EventType, string> = {
        default: "Event",
        outOfOffice: "OOO",
        focusTime: "Focus Time",
      };
      const label = event.recurrence
        ? `Creating recurring ${eventTypeLabels[event.eventType].toLowerCase()}...`
        : `Creating ${eventTypeLabels[event.eventType]}...`;
      await showToast({ style: Toast.Style.Animated, title: label });

      // Build description from notes and URLs
      let fullDescription = event.description || "";
      if (event.urls && event.urls.length > 0) {
        if (fullDescription) fullDescription += "\n\n";
        fullDescription += event.urls.join("\n");
      }

      const baseBody = {
        summary:
          event.eventTitle ||
          (event.eventType === "outOfOffice"
            ? "Out of office"
            : event.eventType === "focusTime"
              ? "Focus time"
              : "Untitled event"),
        ...(event.eventType !== "default" && { eventType: event.eventType }),
        ...(event.recurrence && { recurrence: [event.recurrence] }),
        ...(event.location && { location: event.location }),
        ...(fullDescription && { description: fullDescription }),
        ...(event.showAs && { transparency: event.showAs === "free" ? "transparent" : "opaque" }),
        ...(event.attendees &&
          event.attendees.length > 0 && {
            attendees: event.attendees.map((email) => ({ email })),
          }),
        ...(event.alertMinutes !== undefined && {
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: event.alertMinutes }],
          },
        }),
      };

      // OOO and Focus Time events can't be all-day in Google Calendar API
      // Convert them to timed events spanning the full day(s)
      const needsTimedFormat = event.isAllDay && (event.eventType === "outOfOffice" || event.eventType === "focusTime");

      // Get local timezone - required for recurring events
      const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      let requestBody;
      if (needsTimedFormat) {
        // Convert all-day to timed: start at midnight, end at midnight of end date
        const startDateTime = new Date(event.startDate);
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(event.endDate);
        endDateTime.setHours(0, 0, 0, 0);
        requestBody = {
          ...baseBody,
          start: { dateTime: startDateTime.toISOString(), timeZone: localTimeZone },
          end: { dateTime: endDateTime.toISOString(), timeZone: localTimeZone },
        };
      } else if (event.isAllDay) {
        requestBody = {
          ...baseBody,
          start: { date: format(event.startDate, "yyyy-MM-dd") },
          end: { date: format(event.endDate, "yyyy-MM-dd") },
        };
      } else {
        requestBody = {
          ...baseBody,
          start: { dateTime: event.startDate.toISOString(), timeZone: localTimeZone },
          end: { dateTime: event.endDate.toISOString(), timeZone: localTimeZone },
        };
      }

      await calendar.events.insert({
        calendarId,
        requestBody,
      });

      const successLabel = event.recurrence
        ? `Recurring ${eventTypeLabels[event.eventType].toLowerCase()} created!`
        : `${eventTypeLabels[event.eventType]} created!`;
      await showToast({ style: Toast.Style.Success, title: successLabel });
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create event",
        message: String(error),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getSubtitle = (event: QuickEvent & { eventTypeLabel?: string }) => {
    const parts: string[] = [];

    // Date/time
    parts.push(formatEventDate(event));

    // Calendar
    if (event.matchedCalendar) {
      parts[0] = `${parts[0]} → ${event.matchedCalendar}`;
    }

    // Notes indicator
    if (event.description) {
      const preview = event.description.length > 40 ? event.description.slice(0, 40) + "..." : event.description;
      parts.push(preview);
    }

    // URL count
    if (event.urls && event.urls.length > 0) {
      parts.push(`${event.urls.length} link${event.urls.length > 1 ? "s" : ""}`);
    }

    return parts.join(" · ");
  };

  const getIcon = (eventType: EventType) => {
    switch (eventType) {
      case "outOfOffice":
        return { source: Icon.AirplaneTakeoff, tintColor: "#F6BF27" };
      case "focusTime":
        return { source: Icon.BellDisabled, tintColor: "#7066FE" };
      default:
        return Icon.Calendar;
    }
  };

  return (
    <List
      isLoading={isLoadingCalendars || isCreating}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="E.g. meeting 2pm @(Conference Room) with john@email.com // Discuss Q1 goals"
      throttle
    >
      {!parsedEvent && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="Create event with natural language"
          description="e.g. team standup tomorrow 9-9:30am @(location) with alex@company.com !15m every weekday ~busy /work // Daily sync"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Documentation"
                icon={Icon.Book}
                url="https://github.com/raycast/extensions/tree/main/extensions/google-calendar"
              />
            </ActionPanel>
          }
        />
      )}
      {parsedEvent && (
        <List.Section title="Your quick event">
          <List.Item
            key={parsedEvent.id}
            title={
              parsedEvent.eventTitle ||
              (parsedEvent.eventType === "outOfOffice"
                ? "Out of office"
                : parsedEvent.eventType === "focusTime"
                  ? "Focus time"
                  : "Untitled event")
            }
            subtitle={getSubtitle(parsedEvent)}
            icon={getIcon(parsedEvent.eventType)}
            accessories={[
              ...(parsedEvent.apiLimitationWarning
                ? [
                    {
                      icon: Icon.Warning,
                      tag: { value: "API limit", color: "#AD1357" },
                      tooltip: parsedEvent.apiLimitationWarning,
                    },
                  ]
                : []),
              ...(parsedEvent.location
                ? [{ icon: Icon.Pin, tag: { value: parsedEvent.location, color: "#EF6D02" } }]
                : []),
              ...(parsedEvent.attendees && parsedEvent.attendees.length > 0
                ? [{ icon: Icon.AddPerson, tag: { value: `${parsedEvent.attendees.length}`, color: "#039BE5" } }]
                : []),
              ...(parsedEvent.alertMinutes !== undefined
                ? [
                    {
                      icon: Icon.AlarmRinging,
                      tag: {
                        value: `${parsedEvent.alertMinutes >= 60 ? `${parsedEvent.alertMinutes / 60}h` : `${parsedEvent.alertMinutes}m`}`,
                        color: "#D50201",
                      },
                    },
                  ]
                : []),
              ...(parsedEvent.showAs === "free" ? [{ tag: { value: "Free", color: "#7CB442" } }] : []),
              ...(parsedEvent.showAs === "busy" ? [{ tag: { value: "Busy", color: "#616161" } }] : []),
              ...(parsedEvent.recurrenceLabel
                ? [{ icon: Icon.Repeat, tag: { value: parsedEvent.recurrenceLabel, color: "#775547" } }]
                : []),
              ...(parsedEvent.eventTypeLabel
                ? [
                    {
                      tag: {
                        value: parsedEvent.eventTypeLabel,
                        color: parsedEvent.eventType === "outOfOffice" ? "#F6BF27" : "#7066FE",
                      },
                    },
                  ]
                : []),
              ...(parsedEvent.timezone ? [{ tag: { value: parsedEvent.timezone, color: "#7CB442" } }] : []),
              ...(parsedEvent.matchedCalendar
                ? [
                    {
                      tag: { value: parsedEvent.matchedCalendar, color: parsedEvent.matchedCalendarColor ?? "#616161" },
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel title="Add to calendar">
                {orderedCalendars.map((cal, index) => (
                  <Action
                    key={cal.id}
                    title={`Add to '${cal.name}'`}
                    onAction={() => createEvent(parsedEvent, cal.id)}
                    icon={Icon.Calendar}
                    shortcut={{ modifiers: ["cmd"], key: (index + 1).toString() as Keyboard.KeyEquivalent }}
                  />
                ))}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

export default withGoogleAPIs(QuickCreateEvent);
