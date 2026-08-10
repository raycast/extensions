import { CURRENCY_DEFAULT } from "../constants/config";

/**
 * Convert price from cents to dollars
 */
export function convertCentsToDollars(cents?: number | null): number | null {
  if (cents === null || cents === undefined) return null;
  return cents / 100;
}

export function formatPrice(price?: string | number | null, currency?: string) {
  if (price === null || price === undefined || price === "") return null;

  const amount = typeof price === "number" ? price : Number(price);
  if (Number.isNaN(amount)) return String(price);

  const curr = currency?.toUpperCase() ?? CURRENCY_DEFAULT;

  if (!/^[A-Z]{3}$/.test(curr)) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY_DEFAULT }).format(amount);
  }

  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(amount);
  } catch {
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
