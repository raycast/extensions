/**
 * Validation utilities for form inputs
 */

/**
 * Validates that a value is not empty
 * @param value The value to validate
 * @param fieldName The name of the field (for error messages)
 * @returns Error message or null if valid
 */
export function validateRequired(value: string, fieldName: string): string | null {
  return value.trim() ? null : `${fieldName} is required`;
}

/**
 * Converts a string to a number and validates it's a valid number
 * @internal
 * @param value The value to convert and validate
 * @returns The converted number or null if invalid
 */
function parseNumber(value: string): number | null {
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Validates that a value is a positive number
 * @param value The value to validate
 * @param fieldName The name of the field (for error messages)
 * @returns Error message or null if valid
 */
export function validateNumeric(value: string, fieldName: string): string | null {
  const num = parseNumber(value);
  if (num === null) {
    return `${fieldName} must be a number`;
  }

  // Handle zero (including negative zero) and negative numbers
  if (num <= 0 || Object.is(num, -0)) {
    return `${fieldName} must be a positive number`;
  }

  return null;
}

/**
 * Validates that a value is within a specified range
 * @param value The value to validate
 * @param min The minimum allowed value
 * @param max The maximum allowed value
 * @param fieldName The name of the field (for error messages)
 * @returns Error message or null if valid
 * @throws Error if min > max (invalid range definition)
 */
export function validateRange(value: string, min: number, max: number, fieldName: string): string | null {
  // Validate the range definition
  if (min > max) {
    throw new Error(`Invalid range definition: min (${min}) cannot be greater than max (${max})`);
  }

  const num = parseNumber(value);
  if (num === null) {
    return `${fieldName} must be a number`;
  }
  if (num < min || num > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
}

/**
 * Validates an API key format (basic check)
 * @param apiKey The API key to validate
 * @returns Error message or null if valid
 */
export function validateApiKey(apiKey: string): string | null {
  if (!apiKey.trim()) {
    return "API key is required";
  }
  if (apiKey.length < 10) {
    return "API key appears to be too short";
  }
  return null;
}
