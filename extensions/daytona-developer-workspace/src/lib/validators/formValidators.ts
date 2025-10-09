/**
 * Form validation utilities
 * Reusable validation rules and functions
 */

import { ValidationRule } from "../../types/ui";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a single value against a rule
 */
export function validateValue(value: unknown, rule: ValidationRule): string | null {
  switch (rule.type) {
    case "required":
      if (value === null || value === undefined || value === "") {
        return rule.message;
      }
      break;

    case "minLength":
      if (typeof value === "string" && value.length < (rule.value as number)) {
        return rule.message;
      }
      break;

    case "maxLength":
      if (typeof value === "string" && value.length > (rule.value as number)) {
        return rule.message;
      }
      break;

    case "pattern":
      if (typeof value === "string" && !(rule.value as RegExp).test(value)) {
        return rule.message;
      }
      break;

    case "custom":
      if (rule.validator && !rule.validator(value)) {
        return rule.message;
      }
      break;
  }

  return null;
}

/**
 * Validate multiple values against their respective rules
 */
export function validateForm<T extends Record<string, unknown>>(
  values: T,
  rules: Record<keyof T, ValidationRule[]>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, fieldRules] of Object.entries(rules) as [keyof T, ValidationRule[]][]) {
    const value = values[key];

    for (const rule of fieldRules) {
      const error = validateValue(value, rule);
      if (error) {
        errors.push(`${String(key)}: ${error}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Common validation rules
export const commonValidationRules = {
  required: (message = "This field is required"): ValidationRule => ({
    type: "required",
    message,
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    type: "minLength",
    value: length,
    message: message || `Must be at least ${length} characters long`,
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    type: "maxLength",
    value: length,
    message: message || `Must be no more than ${length} characters long`,
  }),

  email: (message = "Must be a valid email address"): ValidationRule => ({
    type: "pattern",
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message,
  }),

  url: (message = "Must be a valid URL"): ValidationRule => ({
    type: "custom",
    message,
    validator: (value) => {
      if (typeof value !== "string") return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
  }),

  repositoryUrl: (message = "Must be a valid repository URL"): ValidationRule => ({
    type: "custom",
    message,
    validator: (value) => {
      if (typeof value !== "string") return false;
      // SSH format
      if (/^git@[^:]+:[^/]+\/[^/]+\.git?$/.test(value)) return true;
      // HTTPS format
      try {
        const url = new URL(value);
        const pathParts = url.pathname.split("/").filter(Boolean);
        return pathParts.length >= 2;
      } catch {
        return false;
      }
    },
  }),

  sandboxName: (message = "Sandbox name must be 3-50 characters, alphanumeric with hyphens"): ValidationRule => ({
    type: "pattern",
    value: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,48}[a-zA-Z0-9]$/,
    message,
  }),

  apiKey: (message = "Must be a valid API key format"): ValidationRule => ({
    type: "pattern",
    value: /^[a-zA-Z0-9_-]{20,}$/,
    message,
  }),

  positiveNumber: (message = "Must be a positive number"): ValidationRule => ({
    type: "custom",
    message,
    validator: (value) => {
      const num = Number(value);
      return !isNaN(num) && num > 0;
    },
  }),

  integer: (message = "Must be a whole number"): ValidationRule => ({
    type: "custom",
    message,
    validator: (value) => {
      const num = Number(value);
      return !isNaN(num) && Number.isInteger(num);
    },
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    type: "custom",
    message: message || `Must be between ${min} and ${max}`,
    validator: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },
  }),

  oneOf: (allowedValues: unknown[], message?: string): ValidationRule => ({
    type: "custom",
    message: message || `Must be one of: ${allowedValues.join(", ")}`,
    validator: (value) => allowedValues.includes(value),
  }),

  json: (message = "Must be valid JSON"): ValidationRule => ({
    type: "custom",
    message,
    validator: (value) => {
      if (typeof value !== "string") return false;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
  }),
};

/**
 * Create validation rules for common form scenarios
 */
export const formValidationSets = {
  createSandbox: {
    name: [commonValidationRules.required(), commonValidationRules.sandboxName()],
    repository: [commonValidationRules.required(), commonValidationRules.repositoryUrl()],
    branch: [commonValidationRules.maxLength(100)],
  },

  settings: {
    apiKey: [commonValidationRules.required("API key is required"), commonValidationRules.apiKey()],
    daytonaUrl: [commonValidationRules.url("Must be a valid Daytona URL")],
    executionTimeout: [
      commonValidationRules.positiveNumber("Timeout must be a positive number"),
      commonValidationRules.range(1, 3600, "Timeout must be between 1 and 3600 seconds"),
    ],
  },

  gitCommit: {
    message: [
      commonValidationRules.required("Commit message is required"),
      commonValidationRules.minLength(3, "Commit message must be at least 3 characters"),
      commonValidationRules.maxLength(72, "First line should be 72 characters or less"),
    ],
    author: [commonValidationRules.email("Author must be a valid email")],
  },
};

/**
 * Async validation for checking uniqueness or external dependencies
 */
export interface AsyncValidationResult {
  isValid: boolean;
  error?: string;
}

export type AsyncValidator = (value: unknown) => Promise<AsyncValidationResult>;

/**
 * Create async validator for checking sandbox name uniqueness
 */
export function createSandboxNameValidator(checkExistence: (name: string) => Promise<boolean>): AsyncValidator {
  return async (value: unknown): Promise<AsyncValidationResult> => {
    if (typeof value !== "string") {
      return { isValid: false, error: "Invalid sandbox name" };
    }

    try {
      const exists = await checkExistence(value);
      if (exists) {
        return { isValid: false, error: "A sandbox with this name already exists" };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: "Unable to check sandbox name availability" };
    }
  };
}

/**
 * Create async validator for repository URL accessibility
 */
export function createRepositoryValidator(checkRepository: (url: string) => Promise<boolean>): AsyncValidator {
  return async (value: unknown): Promise<AsyncValidationResult> => {
    if (typeof value !== "string") {
      return { isValid: false, error: "Invalid repository URL" };
    }

    try {
      const accessible = await checkRepository(value);
      if (!accessible) {
        return { isValid: false, error: "Repository is not accessible or does not exist" };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: "Unable to verify repository accessibility" };
    }
  };
}
