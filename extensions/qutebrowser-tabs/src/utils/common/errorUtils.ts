/**
 * Utility functions for error handling and formatting
 */

/**
 * Format an error object into a user-friendly string
 * @param error The error object to format
 * @param prefix Optional prefix to add to the error message
 * @returns Formatted error message
 */
export function formatError(error: unknown, prefix?: string): string {
  if (error instanceof Error) {
    return prefix ? `${prefix}: ${error.message}` : error.message;
  }

  if (typeof error === "object" && error !== null) {
    try {
      const errorStr = JSON.stringify(error);
      return prefix ? `${prefix}: ${errorStr}` : errorStr;
    } catch {
      const fallbackStr = String(error);
      return prefix ? `${prefix}: ${fallbackStr}` : fallbackStr;
    }
  }

  const errorStr = String(error);
  return prefix ? `${prefix}: ${errorStr}` : errorStr;
}

/**
 * Create a formatted error with a descriptive message
 * @param error Original error
 * @param message Custom error message
 * @returns New Error object with formatted message
 */
export function createFormattedError(error: unknown, message: string): Error {
  return new Error(formatError(error, message));
}
