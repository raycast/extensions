/**
 * Shared utility functions for Gemini provider.
 */

/**
 * Cleans a string by trimming whitespace and returning null if empty.
 * @param value - String to clean
 * @returns Trimmed string or null if empty/undefined
 */
export function cleanString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
