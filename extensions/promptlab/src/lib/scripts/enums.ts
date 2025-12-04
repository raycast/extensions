/**
 * Return types for scripts.
 */
export enum ReturnType {
  STRING = "string",
  JSON = "json",
}

/**
 * Time durations to use in calendar-related methods.
 */
export enum CalendarDuration {
  DAY = 0,
  WEEK = 1,
  MONTH = 2,
  YEAR = 3,
}

/**
 * Types of EventKt events.
 */
export enum EventType {
  CALENDAR = "calendar",
  REMINDER = "reminder",
}
