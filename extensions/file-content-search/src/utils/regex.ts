type ValidationResult = { isValid: true } | { isValid: false; error: string };

/**
 * Validates a regular expression pattern.
 * @param pattern - The regex pattern string to validate.
 * @returns A validation result indicating success or an error message.
 */
export const validateRegex = (pattern: string): ValidationResult => {
  if (!pattern) {
    return { isValid: false, error: "Pattern cannot be empty" };
  }

  try {
    new RegExp(pattern);
    return { isValid: true };
  } catch (e) {
    return { isValid: false, error: (e as Error).message };
  }
};
