import type { ValidationResult, SlugValidationRules } from "./types";
import { isSlugUsed } from "./cache";

/**
 * Function Signature:
 * value: string | undefined - The parameter can be a string or undefined.
 * value is string - This is a type predicate. It tells TypeScript that if the function returns true, the type of `value` is `string`.
 *
 * Function Implementation:
 * typeof value === 'string' - First, it checks if `value` is a string type (excluding undefined).
 * value.length > 0 - Then, it checks if the string is not empty.
 */
function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

export const validateSlugFormat = (value: string | undefined): ValidationResult => {
  if (!isNonEmptyString(value)) {
    return {
      isValid: false,
      message: "Slug is required",
    };
  }

  // Check if the format is valid
  if (!value.match(/^[a-zA-Z0-9-_]+$/)) {
    return {
      isValid: false,
      message: "Slug can only contain letters, numbers, hyphens and underscores",
    };
  }

  // Add cache validation
  // 1. Fetch slugs and update the Cache when the shorten-link command loads.
  // 2. Synchronously read from the Cache for validation during form validation (because Raycast's form validation doesn't support async).
  if (isSlugUsed(value)) {
    return {
      isValid: false,
      message: "This slug is already taken. Please choose another one.",
    };
  }

  return { isValid: true };
};

export const slugValidation: SlugValidationRules = {
  format: validateSlugFormat,
};
