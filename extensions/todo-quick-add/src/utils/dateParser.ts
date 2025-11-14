/**
 * FlexibleDateParser - TypeScript port from Swift
 * Parses flexible date strings with lenient formatting
 *
 * Supports:
 * - "11/13/25", "11-13-25", "11.13.25"
 * - "11/13", "11-13" (assumes current year)
 * - "tomorrow", "today", "yesterday"
 * - "next week", "next month"
 * - "monday", "friday", etc.
 * - "in 3 days", "in 2 weeks"
 * - Time formats: "3pm", "15:00", "3:30pm"
 */

export function parseDate(input: string): Date | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Handle relative dates
  const relativeDate = parseRelativeDate(trimmed);
  if (relativeDate) return relativeDate;

  // Handle time-only input (e.g., "3pm", "15:00")
  const timeOnly = parseTimeOnly(trimmed);
  if (timeOnly) return timeOnly;

  // Try to parse with various date formats
  return parseWithFormats(trimmed);
}

// MARK: - Relative Date Parsing

function parseRelativeDate(input: string): Date | null {
  const now = new Date();

  // Simple relative dates
  const simpleRelative: Record<string, number> = {
    today: 0,
    now: 0,
    tomorrow: 1,
    tmr: 1,
    tmrw: 1,
    tom: 1,
    yesterday: -1,
    yest: -1,
  };

  if (input in simpleRelative) {
    return addDays(startOfDay(now), simpleRelative[input]);
  }

  // Week/month relative
  if (input === "next week" || input === "nextweek" || input === "nxt week") {
    return addDays(startOfDay(now), 7);
  }
  if (input === "next month" || input === "nextmonth" || input === "nxt month") {
    return addMonths(startOfDay(now), 1);
  }
  if (input === "this weekend" || input === "weekend") {
    return getNextWeekday(6, now); // Saturday
  }

  // Weekdays
  const weekdays: Record<string, number> = {
    monday: 2,
    mon: 2,
    tuesday: 3,
    tue: 3,
    tues: 3,
    wednesday: 4,
    wed: 4,
    thursday: 5,
    thu: 5,
    thur: 5,
    thurs: 5,
    friday: 6,
    fri: 6,
    saturday: 7,
    sat: 7,
    sunday: 1,
    sun: 1,
  };

  if (input in weekdays) {
    return getNextWeekday(weekdays[input], now);
  }

  // Handle "in X days/weeks/months"
  const inMatch = input.match(/^in\s+(\d+)\s+(day|week|month|hour)s?$/);
  if (inMatch) {
    const value = parseInt(inMatch[1]);
    const unit = inMatch[2];

    if (unit === "day") return addDays(startOfDay(now), value);
    if (unit === "week") return addDays(startOfDay(now), value * 7);
    if (unit === "month") return addMonths(startOfDay(now), value);
    if (unit === "hour") return addHours(now, value);
  }

  // Handle "+X days/weeks/hours" format
  if (input.startsWith("+")) {
    const trimmed = input.substring(1).trim();
    const plusMatch = trimmed.match(/^(\d+)\s*(day|week|hour|d|w|h)s?$/);
    if (plusMatch) {
      const value = parseInt(plusMatch[1]);
      const unit = plusMatch[2];

      if (unit === "day" || unit === "d") return addDays(startOfDay(now), value);
      if (unit === "week" || unit === "w") return addDays(startOfDay(now), value * 7);
      if (unit === "hour" || unit === "h") return addHours(now, value);
    }

    // Just "+3" defaults to days
    const numMatch = trimmed.match(/^(\d+)$/);
    if (numMatch) {
      return addDays(startOfDay(now), parseInt(numMatch[1]));
    }
  }

  return null;
}

function getNextWeekday(targetWeekday: number, from: Date): Date {
  const currentWeekday = from.getDay(); // 0 = Sunday, 1 = Monday, etc.
  let daysToAdd = targetWeekday - currentWeekday;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }
  return addDays(startOfDay(from), daysToAdd);
}

// MARK: - Time-Only Parsing

function parseTimeOnly(input: string): Date | null {
  const now = new Date();

  // Match patterns like "3pm", "3:30pm", "15:00", "3:30 pm"
  const timePatterns = [
    /^(\d{1,2})\s*([ap]m)$/i, // "3pm", "3 pm"
    /^(\d{1,2}):(\d{2})\s*([ap]m)$/i, // "3:30pm", "3:30 pm"
    /^(\d{1,2}):(\d{2})$/, // "15:00", "3:30"
  ];

  for (const pattern of timePatterns) {
    const match = input.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2] ? parseInt(match[2]) : 0;
      const ampm = match[3] || match[2];

      // Convert to 24-hour format
      if (typeof ampm === "string") {
        const isPM = ampm.toLowerCase() === "pm";
        if (isPM && hour !== 12) {
          hour += 12;
        } else if (!isPM && hour === 12) {
          hour = 0;
        }
      }

      const result = new Date(now);
      result.setHours(hour, minute, 0, 0);
      return result;
    }
  }

  return null;
}

// MARK: - Format-Based Parsing

function parseWithFormats(input: string): Date | null {
  const now = new Date();

  // Normalize separators to /
  const normalized = input.replace(/-/g, "/").replace(/\./g, "/");

  // Split date and time if present
  const parts = normalized.split(" ");
  const datePart = parts[0];
  const timePart = parts.length > 1 ? parts.slice(1).join(" ") : null;

  // Parse date part
  const dateComponents = datePart.split("/");
  let month: number | null = null;
  let day: number | null = null;
  let year: number | null = null;

  if (dateComponents.length === 3) {
    // Month/Day/Year
    month = parseInt(dateComponents[0]);
    day = parseInt(dateComponents[1]);
    const yearStr = dateComponents[2];

    // Handle 2-digit years
    if (yearStr.length === 2) {
      const shortYear = parseInt(yearStr);
      year = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
    } else {
      year = parseInt(yearStr);
    }
  } else if (dateComponents.length === 2) {
    // Month/Day (assume current year)
    month = parseInt(dateComponents[0]);
    day = parseInt(dateComponents[1]);
    year = now.getFullYear();
  } else if (dateComponents.length === 1) {
    // Just a day number? Assume current month and year
    const d = parseInt(dateComponents[0]);
    if (!isNaN(d)) {
      month = now.getMonth() + 1;
      day = d;
      year = now.getFullYear();
    }
  }

  // Create date from components
  if (month !== null && day !== null && year !== null) {
    const result = new Date(year, month - 1, day);

    // Parse time part if present
    if (timePart) {
      const timeDate = parseTimeOnly(timePart);
      if (timeDate) {
        result.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
      }
    } else {
      result.setHours(0, 0, 0, 0);
    }

    return result;
  }

  return null;
}

// MARK: - Helper Functions

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}
