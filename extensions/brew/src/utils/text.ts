/**
 * Text utilities for the Brew extension.
 *
 * Provides helper functions for text formatting and pluralization.
 */

/**
 * Pluralize a word based on count.
 *
 * Handles special cases like formula/formulae.
 *
 * @param count - The number of items
 * @param singular - The singular form of the word
 * @param plural - Optional custom plural form (defaults to singular + "s")
 * @returns The appropriate singular or plural form
 *
 * @example
 * pluralize(1, "formula", "formulae") // "formula"
 * pluralize(2, "formula", "formulae") // "formulae"
 * pluralize(0, "cask") // "casks"
 * pluralize(1, "package") // "package"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return singular;
  }
  return plural ?? `${singular}s`;
}

/**
 * Format a count with its pluralized noun.
 *
 * @param count - The number of items
 * @param singular - The singular form of the word
 * @param plural - Optional custom plural form
 * @returns Formatted string like "1 formula" or "2 formulae"
 *
 * @example
 * formatCount(1, "formula", "formulae") // "1 formula"
 * formatCount(2, "formula", "formulae") // "2 formulae"
 * formatCount(0, "cask") // "0 casks"
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
