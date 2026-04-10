/**
 * Filename validation for macOS compatibility.
 */

import type { ValidationResult } from "../types";
import { MAX_FILENAME_LENGTH } from "./constants";

// macOS reserved filenames
const RESERVED_NAMES = [".", ".."];

// Check for forward slash (/) and null character
function hasInvalidChars(name: string): boolean {
  return name.includes("/") || name.includes("\0");
}

/**
 * Validates a filename for macOS compatibility
 */
export function validateFilename(name: string): ValidationResult {
  // Check for empty or whitespace-only names
  if (!name || name.trim() === "") {
    return { valid: false, error: "Filename cannot be empty" };
  }

  // Check for invalid characters
  if (hasInvalidChars(name)) {
    return { valid: false, error: "Filename cannot contain / or null characters" };
  }

  // Check for reserved names
  if (RESERVED_NAMES.includes(name)) {
    return { valid: false, error: `"${name}" is a reserved filename` };
  }

  // Check length (macOS HFS+ and APFS limit — measured in UTF-8 bytes)
  const byteLen = Buffer.byteLength(name, "utf8");
  if (byteLen > MAX_FILENAME_LENGTH) {
    return {
      valid: false,
      error: `Filename too long (${byteLen} bytes, max ${MAX_FILENAME_LENGTH})`,
    };
  }

  // Check for names that are only dots (hidden files are fine, but "..." etc are problematic)
  if (/^\.+$/.test(name) && name.length > 2) {
    return { valid: false, error: "Invalid filename (only dots)" };
  }

  return { valid: true };
}

/**
 * Validates a separator string
 */
export function validateSeparator(separator: string): ValidationResult {
  if (separator.includes("/")) {
    return { valid: false, error: "Separator cannot contain /" };
  }

  if (separator.includes("\x00")) {
    return { valid: false, error: "Separator cannot contain null character" };
  }

  return { valid: true };
}

/**
 * Checks if a proposed rename would result in the same name
 */
export function wouldChangeName(oldName: string, newName: string): boolean {
  return oldName !== newName;
}
