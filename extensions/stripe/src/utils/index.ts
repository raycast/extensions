import { startCase, camelCase } from "lodash";
import { CENTS_PER_DOLLAR, DATE_FORMAT_OPTIONS, DATE_LOCALE } from "@src/constants/formatting";

/**
 * Converts a Stripe amount (in cents) to a decimal currency value.
 *
 * @param amount - Amount in cents (Stripe's standard format)
 * @returns Amount as a decimal number
 *
 * @example
 * ```typescript
 * convertAmount(1000) // 10.00
 * convertAmount(2550) // 25.50
 * ```
 */
export const convertAmount = (amount: number): number => amount / CENTS_PER_DOLLAR;

/**
 * Converts a string to title case format.
 *
 * @param str - String to convert
 * @returns Title-cased string
 *
 * @example
 * ```typescript
 * titleCase("payment_intent") // "Payment Intent"
 * titleCase("succeeded") // "Succeeded"
 * ```
 */
export const titleCase = (str: string): string => startCase(camelCase(str));

/**
 * Converts a Unix timestamp to a formatted date string.
 *
 * @param timestamp - Unix timestamp in seconds (Stripe format)
 * @returns Formatted date string or empty string if timestamp is null
 *
 * @example
 * ```typescript
 * convertTimestampToDate(1609459200) // "01/01/2021 00:00 GMT"
 * convertTimestampToDate(null) // ""
 * ```
 */
export const convertTimestampToDate = (timestamp: number | null): string => {
  if (!timestamp) {
    return "";
  }

  const dateFormat = new Intl.DateTimeFormat(DATE_LOCALE, DATE_FORMAT_OPTIONS);
  const milliseconds = timestamp * 1000;
  const dateObj = new Date(milliseconds);
  return dateFormat.format(dateObj);
};

/**
 * Resolves a metadata value to a string representation.
 * Handles string, boolean, number, null, and undefined values.
 *
 * @param value - The metadata value to resolve
 * @returns String representation of the value
 *
 * @example
 * ```typescript
 * resolveMetadataValue("test") // "test"
 * resolveMetadataValue(true) // "true"
 * resolveMetadataValue(42) // "42"
 * resolveMetadataValue(null) // ""
 * ```
 */
export const resolveMetadataValue = (value: string | boolean | number | null | undefined): string => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return `${value}`;
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  return "";
};

// Export all Stripe-specific helpers
export * from "@src/utils/stripe-helpers";

// Export type guards
export * from "@src/utils/type-guards";

// Export status color utilities
export * from "@src/utils/status-colors";

// Export toast helpers
export * from "@src/utils/toast-helpers";

// Export error handling
export * from "@src/utils/error-handling";

// Export environment helpers
export * from "@src/utils/environment-helpers";
