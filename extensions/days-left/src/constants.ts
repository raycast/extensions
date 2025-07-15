// Default dates for the Days Left extension
export const DEFAULT_START_DATE = "2025-07-13";
export const BASE_GOAL_DATE = "2025-07-13";

// Goal intervals in days
export const GOAL_INTERVALS = {
  FIRST_MILESTONE: 7, // 7 days after base date
  SECOND_MILESTONE: 14, // 14 days after base date
  THIRD_MILESTONE: 30, // 1 month after base date
  FINAL_GOAL: 60, // 2 months after base date
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  KEY: "daysLeftData",
  MAX_AGE_HOURS: 24,
} as const;
