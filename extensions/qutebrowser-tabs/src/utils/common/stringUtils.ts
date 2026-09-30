/**
 * Utility functions for string manipulation
 */

/**
 * Sanitize a string for safe use in command-line operations
 * Escapes quotes and dollar signs to prevent command injection
 * @param input String to sanitize
 * @returns Sanitized string
 */
export function sanitizeCommandString(input: string): string {
  return input.replace(/"/g, '\\"').replace(/\$/g, "\\$");
}
