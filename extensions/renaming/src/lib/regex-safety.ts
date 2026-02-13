/**
 * Regex safety utilities to prevent ReDoS attacks
 */

import safeRegex from "safe-regex";

/**
 * Check if a regex pattern is safe from ReDoS attacks
 * Returns true if the pattern is safe, false if potentially dangerous
 */
export function isSafeRegex(pattern: string): boolean {
  try {
    // First check if it's even valid
    new RegExp(pattern);
    // Then check if it's safe from ReDoS
    return safeRegex(pattern);
  } catch {
    // Invalid regex is technically "safe" (won't cause ReDoS)
    // but will fail validation elsewhere
    return true;
  }
}

/**
 * Validate a regex pattern for both validity and safety
 * Returns an error message if invalid/unsafe, or null if OK
 */
export function validateRegexPattern(pattern: string): string | null {
  if (!pattern) {
    return null;
  }

  try {
    new RegExp(pattern);
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid regular expression";
  }

  if (!isSafeRegex(pattern)) {
    return "Pattern may cause performance issues (potential ReDoS)";
  }

  return null;
}
