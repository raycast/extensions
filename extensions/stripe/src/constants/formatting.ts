/**
 * Date and time formatting constants.
 * Used throughout the application for consistent date/time display.
 */

/**
 * Default locale for date formatting.
 * Uses British English format (DD/MM/YYYY).
 */
export const DATE_LOCALE = "en-GB" as const;

/**
 * Standard date format options for displaying Stripe timestamps.
 * Displays: DD/MM/YYYY HH:mm timezone
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  timeZoneName: "short",
  hour12: false,
};

/**
 * Number of cents in a dollar (Stripe standard).
 * Used to convert Stripe's cent-based amounts to decimal currency.
 */
export const CENTS_PER_DOLLAR = 100 as const;
