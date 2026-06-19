/**
 * Shared formatting utilities for the bunq Raycast extension.
 *
 * All formatting functions use the user's preferred locale from
 * Raycast preferences for consistent display.
 */

import { getLocale, DEFAULT_CURRENCY } from "./constants";

/**
 * Options for currency formatting.
 */
export interface FormatCurrencyOptions {
  /** Whether to use absolute value (ignore sign). Default: false */
  absolute?: boolean;
}

/**
 * Formats a currency amount using the user's preferred locale.
 *
 * @param amount - The amount as a string (e.g., "123.45" or "-50.00")
 * @param currency - The currency code (default: EUR)
 * @param options - Formatting options
 * @returns The formatted currency string (e.g., "€123.45")
 *
 * @example
 * ```ts
 * formatCurrency("123.45", "EUR") // "€ 123,45" (nl-NL) or "$123.45" (en-US)
 * formatCurrency("-50.00", "EUR", { absolute: true }) // "€ 50,00"
 * ```
 */
export function formatCurrency(
  amount: string,
  currency: string = DEFAULT_CURRENCY,
  options?: FormatCurrencyOptions,
): string {
  let num = parseFloat(amount);
  if (options?.absolute) {
    num = Math.abs(num);
  }
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency,
  }).format(num);
}

/**
 * Options for date formatting.
 */
export interface FormatDateOptions {
  /** Date format style. Default: "short" */
  style?: "short" | "long";
}

/**
 * Formats a date string for display using the user's preferred locale.
 *
 * @param dateString - An ISO date string (e.g., "2024-01-15T10:30:00Z")
 * @param options - Formatting options
 * @returns The formatted date string
 *
 * @example
 * ```ts
 * formatDate("2024-01-15T10:30:00Z") // "15 jan. 2024" (nl-NL)
 * formatDate("2024-01-15T10:30:00Z", { style: "long" }) // "15 januari 2024"
 * ```
 */
export function formatDate(dateString: string, options?: FormatDateOptions): string {
  const date = new Date(dateString);
  if (options?.style === "long") {
    return date.toLocaleDateString(getLocale(), {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  return date.toLocaleDateString(getLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a Date object for API submission (date only: YYYY-MM-DD).
 *
 * @param date - The Date object to format
 * @returns The formatted date string or empty string if null
 *
 * @example
 * ```ts
 * formatDateForApi(new Date(2024, 0, 15)) // "2024-01-15"
 * ```
 */
export function formatDateForApi(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object for API submission (with time: YYYY-MM-DD HH:MM:SS).
 *
 * Note: Time is always set to 00:00:00 as bunq scheduling uses dates, not times.
 *
 * @param date - The Date object to format
 * @returns The formatted datetime string or empty string if null
 *
 * @example
 * ```ts
 * formatDateTimeForApi(new Date(2024, 0, 15)) // "2024-01-15 00:00:00"
 * ```
 */
export function formatDateTimeForApi(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d} 00:00:00`;
}

/**
 * Payment pointer types supported by bunq.
 */
export type PointerType = "IBAN" | "EMAIL" | "PHONE_NUMBER";

/**
 * Detects the type of payment pointer from its value.
 *
 * @param value - The pointer value (IBAN, email, or phone number)
 * @returns The detected pointer type
 *
 * @example
 * ```ts
 * detectPointerType("NL91ABNA0417164300") // "IBAN"
 * detectPointerType("user@example.com") // "EMAIL"
 * detectPointerType("+31612345678") // "PHONE_NUMBER"
 * ```
 */
export function detectPointerType(value: string): PointerType {
  if (value.includes("@")) {
    return "EMAIL";
  }
  if (/^\+?[0-9\s-]+$/.test(value) && value.replace(/\D/g, "").length >= 10) {
    return "PHONE_NUMBER";
  }
  return "IBAN";
}

/**
 * Formats a category name by converting SNAKE_CASE to Title Case.
 *
 * @param category - The category string (e.g., "PAYMENT_RECEIVED")
 * @returns The formatted category name (e.g., "Payment Received")
 *
 * @example
 * ```ts
 * formatCategoryName("PAYMENT_RECEIVED") // "Payment Received"
 * formatCategoryName("CARD_TRANSACTION") // "Card Transaction"
 * ```
 */
export function formatCategoryName(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
