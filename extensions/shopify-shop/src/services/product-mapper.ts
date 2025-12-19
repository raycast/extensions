import { CURRENCY_DEFAULT } from "../constants/config";

/**
 * Convert price from cents to dollars
 */
export function convertCentsToDollars(cents?: number | null): number | null {
  if (cents === null || cents === undefined) return null;
  return cents / 100;
}

/**
 * Format price with proper currency localization
 * Handles both string prices (already in dollars) and number prices (can be in cents or dollars)
 */
export function formatPrice(price?: string | number | null, currency?: string, isCents?: boolean) {
  if (!price) return null;

  // Handle both string and number inputs
  let amount: number;
  if (typeof price === "number") {
    amount = isCents ? (convertCentsToDollars(price) ?? 0) : price;
  } else {
    amount = Number(price);
  }

  if (Number.isNaN(amount)) return String(price);

  // Default to USD when currency isn't provided. Previously defaulted to INR which caused
  // prices to display in a different currency for many users.
  const curr = currency?.toUpperCase() ?? CURRENCY_DEFAULT;

  // If we're falling back to USD, log a warning so we can track this
  if (!currency) {
    console.warn(`[formatPrice] No currency provided, falling back to ${CURRENCY_DEFAULT}`);
  }

  // Validate currency code (3 letters)
  if (!/^[A-Z]{3}$/.test(curr)) {
    console.warn(`Invalid currency code: ${curr}, falling back to ${CURRENCY_DEFAULT}`);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY_DEFAULT }).format(amount);
  }

  try {
    // Use en-US locale to ensure consistent formatting regardless of user's system locale
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(amount);
    return formatted;
  } catch (error) {
    console.warn(`Currency formatting failed for ${curr}:`, error);
    // Fallback to basic formatting
    return `${curr} ${amount.toFixed(2)}`;
  }
}

/**
 * Normalize `tags` which can be provided as:
 * - `string[]` (array of tag strings)
 * - `string` (comma-separated tags)
 * - `null` / `undefined`
 *
 * This helper returns a canonical `string[]` so callers can reliably
 * iterate and render tags without additional runtime guards.
 */
export function normalizeTags(tags?: string | string[] | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags as string[];
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Remove HTML tags and collapse whitespace for safe text previews.
 */
export function stripHtml(input?: string | null): string {
  if (!input) return "";
  // Remove tags
  const noTags = input.replace(/<[^>]*>/g, "");
  // Collapse whitespace and trim
  return noTags.replace(/\s+/g, " ").trim();
}
