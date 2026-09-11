import { createSnippetBodySchema, type SnippetValidation } from "../schemas";

export type { SnippetValidation };

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

/**
 * Validates a snippet body for correct separator usage and content
 * Uses Zod schema for validation
 *
 * @param body - The snippet body to validate
 * @param separator - The separator used for variations
 * @returns Validation result with status and options
 */
export function validateSnippet(body: string, separator: string): SnippetValidation {
  const schema = createSnippetBodySchema(separator);
  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      isValid: false,
      error: result.error.issues[0]?.message || "Invalid snippet",
      options: [],
    };
  }

  // Parse options for valid snippets
  const options = parseSnippetOptions(body, separator);

  // If no separator used, return single option
  if (!body.includes(separator)) {
    return { isValid: true, options: [body.trim()] };
  }

  return { isValid: true, options };
}

/**
 * Validates snippet body and returns parsed options or throws error
 * Useful for strict validation scenarios
 */
export function validateSnippetStrict(body: string, separator: string): string[] {
  const schema = createSnippetBodySchema(separator);
  schema.parse(body); // Throws on error
  return parseSnippetOptions(body, separator);
}
