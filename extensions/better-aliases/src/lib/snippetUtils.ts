/**
 * Returns a randomly selected value if the input contains a separator
 * @param value - The raw snippet value
 * @param separator - The separator string (e.g., ";;")
 * @returns A single randomized value or the original value
 */
export function getRandomizedValue(value: string, separator?: string): string {
  if (!separator?.trim()) return value;

  const options = value.split(separator);
  if (options.length <= 1) return value;

  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex].trim();
}

/**
 * Parses snippet body into individual variation options
 * @param body - The full snippet body
 * @param separator - The separator used for variations
 * @returns Array of trimmed snippet options
 */
export function parseSnippetOptions(body: string, separator: string): string[] {
  return body
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface SnippetValidation {
  isValid: boolean;
  error?: string;
  options: string[];
}

/**
 * Validates a snippet body for correct separator usage and content
 * @param body - The snippet body to validate
 * @param separator - The separator used for variations
 * @returns Validation result with status and options
 */
export function validateSnippet(body: string, separator: string): SnippetValidation {
  const usesSeparator = body.includes(separator);

  if (!usesSeparator) {
    if (!body.trim()) {
      return {
        isValid: false,
        error: "Please provide snippet content",
        options: [],
      };
    }
    return { isValid: true, options: [body.trim()] };
  }

  const options = parseSnippetOptions(body, separator);
  if (options.length < 2) {
    return {
      isValid: false,
      error: `When using "${separator}" separator, please provide at least 2 snippets`,
      options: [],
    };
  }

  return { isValid: true, options };
}
