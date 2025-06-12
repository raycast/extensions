import type { ValidationResult, UrlValidationRules } from "./types";

export const validateUrlFormat = (value: string | undefined): ValidationResult => {
  if (!value) {
    return { isValid: false, message: "URL is required" };
  }
  if (!value.match(/^https?:\/\/.+/)) {
    return {
      isValid: false,
      message: "A valid URL starting with http:// or https:// is required",
    };
  }
  return { isValid: true };
};

export const urlValidation: UrlValidationRules = {
  format: validateUrlFormat,
};
