/**
 * Time formatting utilities for Craft extension
 * Supports custom time format patterns
 */

interface TimeTokens {
  [key: string]: (date: Date) => string;
}

// Time formatting tokens
const TIME_TOKENS: TimeTokens = {
  // Hour tokens (24-hour)
  HH: (date: Date) => date.getHours().toString().padStart(2, "0"),
  H: (date: Date) => date.getHours().toString(),

  // Hour tokens (12-hour)
  hh: (date: Date) => {
    const hours = date.getHours() % 12 || 12;
    return hours.toString().padStart(2, "0");
  },
  h: (date: Date) => {
    const hours = date.getHours() % 12 || 12;
    return hours.toString();
  },

  // Minute tokens
  mm: (date: Date) => date.getMinutes().toString().padStart(2, "0"),
  m: (date: Date) => date.getMinutes().toString(),

  // Second tokens
  ss: (date: Date) => date.getSeconds().toString().padStart(2, "0"),
  s: (date: Date) => date.getSeconds().toString(),

  // AM/PM tokens
  A: (date: Date) => (date.getHours() >= 12 ? "PM" : "AM"),
  a: (date: Date) => (date.getHours() >= 12 ? "pm" : "am"),
};

/**
 * Format a time using a custom pattern
 * @param date - The date to format time from
 * @param pattern - The format pattern (e.g., "HH:mm", "h:mm A", "HH:mm:ss")
 * @returns The formatted time string
 */
export function formatTime(date: Date, pattern: string): string {
  let result = pattern;

  // Sort tokens by length (longest first) to avoid partial replacements
  const sortedTokens = Object.keys(TIME_TOKENS).sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    const regex = new RegExp(token, "g");
    result = result.replace(regex, TIME_TOKENS[token](date));
  }

  return result;
}

/**
 * Generate Craft's internal date format for daily notes (YYYY.MM.DD)
 * This format is used for the day:// link and database queries
 * @param date - The date to format
 * @returns The Craft internal date format string
 */
export function formatCraftInternalDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}.${month}.${day}`;
}

// Time format examples for user reference
export const TIME_FORMAT_EXAMPLES = {
  "HH:mm": "14:30",
  "HH:mm:ss": "14:30:45",
  "h:mm A": "2:30 PM",
  "h:mm a": "2:30 pm",
  "H:mm": "14:30",
} as const;
