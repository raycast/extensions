/**
 * Creates a preview of the text content
 * Trims whitespace and truncates long text for display
 *
 * @param text - Full text content
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Trimmed and potentially truncated text
 */
export function getTextPreview(text: string, maxLength = 50): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.substring(0, maxLength)}...` : trimmed;
}

/**
 * Calculates statistics about the text content
 * Used for progress feedback in UI
 *
 * @param text - Text content to analyze
 * @returns Object containing word and character counts
 */
export function getTextStats(text: string) {
  const trimmed = text.trim();
  return {
    wordCount: trimmed ? trimmed.split(/\s+/).length : 0,
    charCount: text.length,
  };
}
