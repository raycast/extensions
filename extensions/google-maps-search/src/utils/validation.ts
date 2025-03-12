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
 * Validates that a value is a positive number
 * @param value The value to validate
 * @param fieldName The name of the field (for error messages)
 * @returns Error message or null if valid
 */
export function validateNumeric(value: string, fieldName: string): string | null {
  const num = Number(value);
  return !isNaN(num) && num > 0 ? null : `${fieldName} must be a positive number`;
}

/**
 * Validates that a value is within a specified range
 * @param value The value to validate
 * @param min The minimum allowed value
 * @param max The maximum allowed value
 * @param fieldName The name of the field (for error messages)
 * @returns Error message or null if valid
 */
export function validateRange(value: string, min: number, max: number, fieldName: string): string | null {
  const num = Number(value);
  if (isNaN(num)) {
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
