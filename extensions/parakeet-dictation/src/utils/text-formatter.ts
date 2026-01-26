export interface FormatOptions {
  autoCapitalize?: boolean;
  autoPunctuation?: boolean;
  addSpaceAfter?: boolean;
}

export class TextFormatter {
  /**
   * Format text according to preferences
   */
  static format(text: string, options: FormatOptions = {}): string {
    let formatted = text;

    // Clean up extra whitespace
    formatted = formatted.replace(/\s+/g, " ").trim();

    // Apply capitalization if enabled (and if not already capitalized)
    if (options.autoCapitalize) {
      formatted = this.capitalize(formatted);
    }

    // Apply punctuation if enabled (and if missing)
    if (options.autoPunctuation) {
      formatted = this.addPunctuation(formatted);
    }

    // Add trailing space if enabled
    if (options.addSpaceAfter) {
      formatted += " ";
    }

    return formatted;
  }

  /**
   * Capitalize first letter of sentences
   */
  static capitalize(text: string): string {
    if (!text) return text;

    // Capitalize first character if it's lowercase
    let result = text.charAt(0).toUpperCase() + text.slice(1);

    // Capitalize after sentence-ending punctuation (. ! ?)
    result = result.replace(/([.!?]\s+)([a-z])/g, (match, punct, letter) => {
      return punct + letter.toUpperCase();
    });

    return result;
  }

  /**
   * Add basic punctuation if missing
   */
  static addPunctuation(text: string): string {
    if (!text) return text;

    // Check if text already ends with punctuation
    const endsWithPunctuation = /[.!?]$/.test(text.trim());

    if (!endsWithPunctuation) {
      // Add period at the end
      return text.trim() + ".";
    }

    return text;
  }

  /**
   * Count words in text
   */
  static countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  /**
   * Format duration in MM:SS format
   */
  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Truncate text for preview
   */
  static truncate(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  }
}
