import type { ValidationResult, UrlValidationRules } from "./types";

export const validateUrlFormat = (value: string | undefined): ValidationResult => {
  if (!value) {
    return { isValid: false, message: "URL is required" };
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        isValid: false,
        message: "A valid URL starting with http:// or https:// is required",
      };
    }
  } catch {
    return {
      isValid: false,
      message: "Invalid URL",
    };
  }
  return { isValid: true };
};

export const urlValidation: UrlValidationRules = {
  format: validateUrlFormat,
};
