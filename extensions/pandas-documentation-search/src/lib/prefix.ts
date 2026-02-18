/**
 * Replace 'pandas.' prefix with 'pd.' in a string
 * @param text The text to process
 * @returns The text with 'pandas.' replaced by 'pd.'
 */
export function replacePrefix(text: string): string {
  return text.replace(/\bpandas\./g, "pd.");
}

/**
 * Apply prefix replacement to text based on user preference
 * @param text The text to process
 * @param useShortPrefix Whether to use 'pd.' instead of 'pandas.'
 * @returns The text with prefix replaced if useShortPrefix is true
 */
export function applyPrefixPreference(text: string, useShortPrefix: boolean): string {
  if (!useShortPrefix) {
    return text;
  }
  return replacePrefix(text);
}
