import { PromptTemplate } from "../../types";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  suggestions?: string[];
}

export function createValidResult(): ValidationResult {
  return { valid: true };
}

export function createInvalidResult(error: string, suggestions?: string[]): ValidationResult {
  return {
    valid: false,
    error,
    suggestions,
  };
}

export function createConditionalResult(
  condition: boolean,
  errorMessage: string,
  suggestions?: string[]
): ValidationResult {
  return condition ? createValidResult() : createInvalidResult(errorMessage, suggestions);
}

export function validateRequired(value: string | undefined, fieldName: string): ValidationResult {
  return createConditionalResult(Boolean(value?.trim()), `${fieldName} is required`);
}

export function validateMaxLength(value: string | undefined, maxLength: number, fieldName: string): ValidationResult {
  if (!value) return createValidResult();

  return createConditionalResult(value.length <= maxLength, `${fieldName} is too long (max ${maxLength} characters)`);
}

export function validateConditionalRequired(
  condition: boolean,
  value: string | undefined,
  fieldName: string,
  conditionDescription: string
): ValidationResult {
  if (!condition) return createValidResult();

  return createConditionalResult(Boolean(value?.trim()), `${fieldName} is required for ${conditionDescription}`);
}

export function formatStringTemplate(content: string, placeholder: string, value: string | number): string {
  return content.replace(`{${placeholder}}`, value.toString());
}

/**
 * Validates a PromptTemplate structure - public validation function
 */
export function validatePromptTemplate(template: PromptTemplate): boolean {
  if (!template.id || !template.id.trim()) {
    throw new Error("Template ID cannot be empty");
  }

  if (!template.name || !template.name.trim()) {
    throw new Error("Template name cannot be empty");
  }

  if (!template.sections.instructions.trim()) {
    throw new Error("Template must have instructions section");
  }

  return true;
}
