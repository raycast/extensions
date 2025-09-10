/**
 * Validation utilities barrel export
 * Provides clean imports for all validation functions and types
 */

// Form validation
export { validateFormValues } from "./form-validation";

// Content validation
export { validateClipboardContent } from "./content-validation";

// File system validation
export { validateDirectory, validateTargetFolder, createFilePath } from "./file-system-validation";

// URL validation
export {
  isValidImageUrl,
  validateImageUrl,
  isSecureImageUrl,
  getSecureEntityIcon,
  IMAGE_URL_VALIDATION,
} from "./url-validation";

// Validation helpers
export {
  type ValidationResult,
  createValidResult,
  createInvalidResult,
  createConditionalResult,
  validateRequired,
  validateMaxLength,
  validateConditionalRequired,
  formatStringTemplate,
  validatePromptTemplate,
} from "./validation-helpers";

// Type guards and utilities (re-exported from parent utils)
export { isManageCommand, getSafeValue, isValidatedInput } from "../type-guards";

// Legacy re-export for backward compatibility
export * from "./validation";
