/**
 * Replace 'numpy.' prefix with 'np.' in a string
 * @param text The text to process
 * @returns The text with 'numpy.' replaced by 'np.'
 */
export function replacePrefix(text: string): string {
  return text.replace(/\bnumpy\./g, "np.");
}

/**
 * Apply prefix replacement to text based on user preference
 * @param text The text to process
 * @param useShortPrefix Whether to use 'np.' instead of 'numpy.'
 * @returns The text with prefix replaced if useShortPrefix is true
 */
export function applyPrefixPreference(text: string, useShortPrefix: boolean): string {
  if (!useShortPrefix) {
    return text;
  }
  return replacePrefix(text);
}
