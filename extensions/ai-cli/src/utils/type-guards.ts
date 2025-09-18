import { ValidatedInput } from "../types";

/**
 * Creates validated input with type preservation
 */
export const createValidatedInput = <T>(input: T): ValidatedInput<T> => input;

export function isValidatedInput(value: unknown): value is ValidatedInput<string> {
  return typeof value === "string" && value.trim().length > 0;
}

export function isManageCommand(value: string | undefined): boolean {
  return Boolean(value?.startsWith("MANAGE_"));
}

export function getSafeValue(value: string | undefined, fallback: string): string {
  return isManageCommand(value) ? fallback : value || fallback;
}

/**
 * Type guard for PromptTemplate interface
 */
export function isValidPromptTemplate(obj: unknown): obj is import("../types/prompt-template").PromptTemplate {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const template = obj as Record<string, unknown>;

  if (!isValidString(template.id) || !isValidString(template.name)) {
    return false;
  }

  if (!isValidBoolean(template.isBuiltIn)) {
    return false;
  }

  if (template.icon !== undefined && typeof template.icon !== "string") {
    return false;
  }

  return isValidSections(template.sections);
}

function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidBoolean(value: unknown): value is boolean {
  return value === true || value === false;
}

function isValidSections(sections: unknown): boolean {
  if (!sections || typeof sections !== "object") {
    return false;
  }

  const sectionObj = sections as Record<string, unknown>;

  if (!isValidString(sectionObj.instructions)) {
    return false;
  }

  return sectionObj.output === undefined || typeof sectionObj.output === "string";
}
