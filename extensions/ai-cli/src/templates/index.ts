// Template System Barrel Exports

// Core template building functionality
export { buildPrompt, validateBuildParams } from "./prompt-builder";

// Built-in template definitions and utilities
export {
  getBuiltInTemplate,
  getBuiltInTemplateIds,
  isBuiltInTemplate,
  getAllBuiltInTemplates,
  BUILT_IN_TEMPLATES,
  SLACK_TEMPLATE,
  CODE_REVIEW_TEMPLATE,
  EMAIL_TEMPLATE,
  BUG_REPORT_TEMPLATE,
  TECHNICAL_DOCS_TEMPLATE,
  CUSTOM_TEMPLATE,
} from "./built-in-templates";

// Legacy prompt generation
export { generateFullPrompt, TONES } from "./prompts";

// Template types
export type { PromptTemplate, PromptBuildParams } from "../types/prompt-template";

export { createPromptTemplate } from "./prompt-builder";
export { validatePromptTemplate } from "../utils/validation";
export { isValidPromptTemplate } from "../utils/type-guards";
