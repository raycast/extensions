/**
 * Utility functions for date handling
 */

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateForAPI(date: Date): string {
  // Create a new date with the local timezone to avoid timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Format a date range for display
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  // Create new dates to ensure we're working with local time
  const start = new Date(startDate.getTime());
  const end = new Date(endDate.getTime());

  // Same day
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Different days
  const startFormatted = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endFormatted = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Get today's date in local time
 */
export function getToday(): Date {
  const now = new Date();
  // Just reset the time components without UTC conversion
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Parse a date string from BambooHR API
 * BambooHR returns dates in YYYY-MM-DD format
 * This function ensures we correctly interpret them.
 */
export function parseBambooHRDate(dateString: string): Date {
  // If it's not in YYYY-MM-DD format, fall back to regular parsing
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateString);
  }

  // For YYYY-MM-DD format, explicitly create the date with local timezone handling
  const [year, month, day] = dateString.split("-").map(Number);

  // Create the date object using local timezone
  // Use noon to avoid any edge cases around DST transitions
  const date = new Date(year, month - 1, day, 12, 0, 0);

  return date;
}

/**
 * Check if a date range includes today
 */
export function isOutToday(startDateStr: string, endDateStr: string): boolean {
  // Get today at midnight in local time
  const today = getToday();

  // Parse dates from BambooHR using the special parser
  const startDate = parseBambooHRDate(startDateStr);
  startDate.setHours(0, 0, 0, 0);

  const endDate = parseBambooHRDate(endDateStr);
  endDate.setHours(23, 59, 59, 999); // End of day

  return today >= startDate && today <= endDate;
}

// Get start and end dates for a period (e.g., next week, next month)
export function getDateRangeForPeriod(period: string): { start: Date; end: Date } | null {
  const today = getToday();

  const start = new Date(today);
  const end = new Date(today);

  period = period.toLowerCase();

  if (period.includes("today")) {
    // Today only
    return { start, end };
  } else if (period.includes("tomorrow")) {
    // Tomorrow only
    start.setDate(today.getDate() + 1);
    end.setDate(today.getDate() + 1);
    return { start, end };
  } else if (period.includes("this week")) {
    // This week (until Sunday)
    const daysUntilSunday = 7 - today.getDay();
    end.setDate(today.getDate() + daysUntilSunday);
    return { start, end };
  } else if (period.includes("next week")) {
    // Next week (Monday to Sunday)
    const daysUntilNextMonday = (8 - today.getDay()) % 7;
    start.setDate(today.getDate() + daysUntilNextMonday);
    end.setDate(start.getDate() + 6);
    return { start, end };
  } else if (period.includes("this month")) {
    // Remaining days in current month
    end.setMonth(today.getMonth() + 1, 0); // Last day of current month
    return { start, end };
  } else if (period.includes("next month")) {
    // Next month
    start.setMonth(today.getMonth() + 1, 1); // First day of next month
    end.setMonth(today.getMonth() + 2, 0); // Last day of next month
    return { start, end };
  }

  // Couldn't identify the period
  return null;
}

/**
 * Parse a date from natural language
 */
export function parseDate(dateText: string): Date | null {
  try {
    // Handle relative dates
    const lowerDateText = dateText.toLowerCase();
    const today = new Date();

    if (lowerDateText.includes("today")) {
      return today;
    } else if (lowerDateText.includes("tomorrow")) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    } else if (lowerDateText.includes("yesterday")) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    } else if (lowerDateText.match(/next\s+(mon|tues|wednes|thurs|fri|satur|sun)day/i)) {
      const dayMap: Record<string, number> = {
        mon: 1,
        tues: 2,
        wednes: 3,
        thurs: 4,
        fri: 5,
        satur: 6,
        sun: 0,
      };

      const dayMatch = lowerDateText.match(/next\s+(mon|tues|wednes|thurs|fri|satur|sun)day/i);
      if (dayMatch) {
        const targetDay = dayMap[dayMatch[1].toLowerCase()];
        const result = new Date(today);
        const currentDay = today.getDay();

        // Calculate days to add (7 ensures it's next week, not this week)
        const daysToAdd = ((7 - currentDay + targetDay) % 7) + 7;
        result.setDate(result.getDate() + daysToAdd);
        return result;
      }
    } else if (lowerDateText.match(/(mon|tues|wednes|thurs|fri|satur|sun)day/i)) {
      // This week's day
      const dayMap: Record<string, number> = {
        mon: 1,
        tues: 2,
        wednes: 3,
        thurs: 4,
        fri: 5,
        satur: 6,
        sun: 0,
      };

      const dayMatch = lowerDateText.match(/(mon|tues|wednes|thurs|fri|satur|sun)day/i);
      if (dayMatch) {
        const targetDay = dayMap[dayMatch[1].toLowerCase()];
        const result = new Date(today);
        const currentDay = today.getDay();

        // Calculate days to add (targeting this week)
        let daysToAdd = (7 - currentDay + targetDay) % 7;
        if (daysToAdd === 0) {
          daysToAdd = 7; // If today is the day, go to next week
        }
        result.setDate(result.getDate() + daysToAdd);
        return result;
      }
    }

    // Try to parse as a date
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    return null;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  // Reset time components for accurate comparison
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const compareStart = new Date(start);
  compareStart.setHours(0, 0, 0, 0);

  const compareEnd = new Date(end);
  compareEnd.setHours(0, 0, 0, 0);

  return compareDate >= compareStart && compareDate <= compareEnd;
}

/**
 * Get the difference in weeks between two dates
 */
export function getWeekDifference(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const dayDifference = Math.round(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
  return Math.floor(dayDifference / 7);
}
