/**
 * Comprehensive utility functions for PagerDuty On-Call Extension
 * Optimized with modern ES6 features for readability and maintainability
 */

import { OnCallScheduleEntry } from "./types";

// =============================================================================
// DATE & TIME FORMATTING UTILITIES
// =============================================================================

/**
 * Formats a date into a human-readable time string
 * @param date - The date to format
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export const formatTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

/**
 * Formats a date with smart relative formatting
 * @param date - The date to format
 * @returns Smart formatted date (e.g., "Today", "Tomorrow", "Mon, Dec 25")
 */
export const formatDate = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a date for display in accessories (day abbreviation and date)
 * @param date - The date to format
 * @returns Formatted string for accessories (e.g., "Tue, Jul 25")
 */
export const formatAccessoryDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/**
 * Calculates and formats the duration between two dates
 * @param startDate - Start date of the period
 * @param endDate - End date of the period
 * @returns Human-readable duration (e.g., "2d 4h", "8 hours", "30 minutes")
 */
export const calculateDuration = (startDate: Date, endDate: Date): string => {
  const durationMs = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : pluralize(days, "day");
  }

  if (hours === 0) {
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return pluralize(minutes, "minute");
  }

  return pluralize(hours, "hour");
};

/**
 * Creates a formatted date range string for display
 * @param schedule - The schedule entry to format
 * @returns Formatted date range (e.g., "2:30 PM - 6:00 PM" or "Today 2:30 PM - Tomorrow 6:00 AM")
 */
export const formatDateRange = (schedule: OnCallScheduleEntry): string => {
  const startDate = formatDate(schedule.start);
  const endDate = formatDate(schedule.end);

  return startDate === endDate
    ? `${formatTime(schedule.start)} - ${formatTime(schedule.end)}`
    : `${startDate} ${formatTime(schedule.start)} - ${endDate} ${formatTime(schedule.end)}`;
};

/**
 * Formats date for month grouping
 * @param date - Date to format
 * @returns Month and year string (e.g., "December 2024")
 */
export const formatMonthYear = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

// =============================================================================
// SCHEDULE PROCESSING UTILITIES
// =============================================================================

/**
 * Extracts schedule name with fallback handling
 * @param schedule - Schedule object with nested properties
 * @returns Clean schedule name or fallback
 */
export const getScheduleName = (schedule: { schedule?: { summary?: string; name?: string } }): string =>
  schedule?.schedule?.summary || schedule?.schedule?.name || "Unknown Schedule";

/**
 * Categorizes a schedule entry based on current time
 * @param schedule - The schedule entry to categorize
 * @param now - Current date (defaults to new Date())
 * @returns Object with boolean flags for schedule status
 */
export const categorizeSchedule = (schedule: OnCallScheduleEntry, now: Date = new Date()) => ({
  isPast: schedule.end < now,
  isActive: now >= schedule.start && now <= schedule.end,
  isUpcoming: schedule.start > now,
});

/**
 * Groups schedules by month-year for organized display
 * @param schedules - Array of schedule entries
 * @returns Record with month-year keys and schedule arrays
 */
export const groupSchedulesByMonth = (schedules: OnCallScheduleEntry[]): Record =>
  schedules.reduce((groups, schedule) => {
    const monthYear = formatMonthYear(schedule.start);
    return {
      ...groups,
      [monthYear]: [...(groups[monthYear] || []), schedule],
    };
  }, {} as Record);

/**
 * Sorts month keys chronologically
 * @param groupedSchedules - Grouped schedules object
 * @returns Array of month keys sorted by date
 */
export const sortMonthsChronologically = (groupedSchedules: Record): string[] =>
  Object.keys(groupedSchedules).sort((a, b) => {
    const aDate = new Date(groupedSchedules[a][0].start);
    const bDate = new Date(groupedSchedules[b][0].start);
    return aDate.getTime() - bDate.getTime();
  });

// =============================================================================
// FILTER UTILITIES
// =============================================================================

export type FilterType = "recent_and_upcoming" | "past" | "all";

/**
 * Available filter configurations for the extension
 */
export const FILTER_CONFIG = {
  recent_and_upcoming: {
    title: "Recent & Upcoming",
    description: "Last 2 completed shifts + all upcoming",
  },
  past: {
    title: "Past Shifts",
    description: "All completed on-call duties",
  },
  all: {
    title: "All (4 months)",
    description: "Next 4 months from today",
  },
} as const;

/**
 * Filters schedules based on the selected filter type using modern ES6 approach
 * @param schedules - Object containing categorized schedules
 * @param filterType - The filter to apply
 * @returns Filtered array of schedule entries
 */
export const filterSchedules = (
  schedules: {
    current: OnCallScheduleEntry[];
    all: OnCallScheduleEntry[];
    upcoming: OnCallScheduleEntry[];
    past: OnCallScheduleEntry[];
  },
  filterType: FilterType,
): OnCallScheduleEntry[] => {
  const { current, all, upcoming, past } = schedules;
  const now = new Date();

  const filterMap: Record = {
    recent_and_upcoming: () => [
      ...past.slice(-2), // Last 2 completed shifts
      ...current, // Currently active
      ...upcoming, // All upcoming
    ],
    past: () => past,
    all: () => {
      // Show only schedules from today onwards for the next 4 months
      const fourMonthsFromNow = new Date(now);
      fourMonthsFromNow.setMonth(now.getMonth() + 4);

      return all
        .filter(
          (schedule) =>
            schedule.start >= now && // From today onwards
            schedule.start <= fourMonthsFromNow, // Within 4 months
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime());
    },
  };

  return filterMap[filterType]();
};

// =============================================================================
// SEARCH UTILITIES
// =============================================================================

/**
 * Creates a searchable string from a schedule entry
 * @param schedule - The schedule entry
 * @returns Lowercase searchable string with all relevant data
 */
export const createSearchableString = (schedule: OnCallScheduleEntry): string => {
  const scheduleName = getScheduleName(schedule);
  const dateRange = formatDateRange(schedule);
  const duration = calculateDuration(schedule.start, schedule.end);
  const monthYear = formatMonthYear(schedule.start);
  const { isPast, isActive } = categorizeSchedule(schedule);

  const status = isPast ? "past completed" : isActive ? "active current" : "upcoming future";

  return [
    scheduleName,
    dateRange,
    duration,
    monthYear,
    status,
    schedule.start.toDateString(),
    schedule.end.toDateString(),
  ]
    .join(" ")
    .toLowerCase();
};

/**
 * Searches schedules by term matching dates, schedule names, or status
 * @param schedules - Array of schedules to search
 * @param searchTerm - The search term
 * @returns Filtered schedules matching the search term
 */
export const searchSchedules = (schedules: OnCallScheduleEntry[], searchTerm: string): OnCallScheduleEntry[] => {
  if (!searchTerm.trim()) return schedules;

  const normalizedTerm = searchTerm.toLowerCase().trim();

  return schedules.filter((schedule) => createSearchableString(schedule).includes(normalizedTerm));
};

// =============================================================================
// GENERAL UTILITIES
// =============================================================================

/**
 * Smart pluralization helper with ES6 template literals
 * @param count - Number to check for pluralization
 * @param word - Base word to pluralize
 * @returns Properly pluralized string
 */
export const pluralize = (count: number, word: string): string => `${count} ${word}${count !== 1 ? "s" : ""}`;

/**
 * Creates a unique React key for schedule items to prevent collisions
 * @param schedule - Schedule entry
 * @param monthYear - Month year string
 * @param index - Array index
 * @returns Unique key string
 */
export const createUniqueKey = (schedule: OnCallScheduleEntry, monthYear: string, index: number): string =>
  `${monthYear}-${schedule?.schedule?.id || index}-${schedule.start.getTime()}-${schedule.end.getTime()}-${index}`;

/**
 * Time-based greeting for a friendly user experience
 * @returns Contextual greeting based on time of day
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good Morning!" : hour < 18 ? "Good Afternoon!" : "Good Evening!";
};

/**
 * Calculates relative time from now (useful for upcoming shifts)
 * @param date - Future date to calculate relative time for
 * @returns Human-readable relative time string
 */
export const getRelativeTime = (date: Date): string => {
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `in ${pluralize(diffDays, "day")}`;
  if (diffHours > 0) return `in ${pluralize(diffHours, "hour")}`;
  if (diffMinutes > 0) return `in ${pluralize(diffMinutes, "minute")}`;
  return "now";
};
