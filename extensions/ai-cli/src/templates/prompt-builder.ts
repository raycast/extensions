// New Structured Prompt Builder

import type { PromptBuildParams, PromptTemplate } from "@/types/prompt-template";
import { messages } from "@/locale/en/messages";

/**
 * Creates a PromptTemplate with validation
 */
export function createPromptTemplate(
  id: string,
  name: string,
  sections: PromptTemplate["sections"],
  icon?: string,
  isBuiltIn = false
): PromptTemplate {
  const template: PromptTemplate = {
    id,
    name,
    icon,
    isBuiltIn,
    sections,
  };

  if (!validatePromptTemplateStructure(template)) {
    throw new Error(messages.promptBuilder.validation.invalidTemplate.replace("{id}", id));
  }

  return template;
}

/**
 * Validates a PromptTemplate structure
 */
function validatePromptTemplateStructure(template: PromptTemplate): boolean {
  if (!template.id?.trim()) {
    throw new Error(messages.promptBuilder.validation.templateIdEmpty);
  }

  if (!template.name?.trim()) {
    throw new Error(messages.promptBuilder.validation.templateNameEmpty);
  }

  return true;
}

/**
 * Builds a structured prompt from a template and parameters
 */
export function buildPrompt(template: PromptTemplate, params: PromptBuildParams): string {
  const sections: string[] = [];

  const isCustomTemplate = template.id === "custom";

  if (params.isFollowUp) {
    sections.push(params.text);
  }
  // Special handling for the built-in "None" format option
  // This format uses the input text directly as instructions with minimal structure
  else if (isCustomTemplate) {
    // For custom format, use input text as instructions
    sections.push(messages.promptBuilder.sections.instructions);
    sections.push(params.text);

    // Only add context if provided (no empty line if no context)
    if (params.context && params.context.trim()) {
      sections.push("");
      sections.push(messages.promptBuilder.sections.additionalContext);
      sections.push(params.context);
    }

    // Add tone section if template has tone placeholder and params include tone
    if (params.tone?.guidelines) {
      sections.push(messages.promptBuilder.sections.toneAndStyle);
      sections.push(params.tone.guidelines);
      sections.push("");
    }

    // Do not add multi-variant output section for custom format
  } else {
    // Standard flow for all other templates (Slack, GitHub PR, user-created templates)
    // Add main instructions section
    if (template.sections.instructions) {
      sections.push(messages.promptBuilder.sections.instructions);
      sections.push(template.sections.instructions);
      sections.push("");
    }

    // Add the original text section
    sections.push(messages.promptBuilder.sections.textToProcess);
    sections.push(params.text);
    sections.push("");

    // Add context section if template has context placeholder and params include non-empty context
    if (params.context && params.context.trim()) {
      sections.push(messages.promptBuilder.sections.additionalContext);
      sections.push(params.context);
      sections.push("");
    }

    // Add requirements section if template has requirements
    if (template.sections.requirements) {
      sections.push(messages.promptBuilder.sections.requirements);
      sections.push(template.sections.requirements);
      sections.push("");
    }

    // Add tone section if template has tone placeholder and params include tone
    if (params.tone?.guidelines) {
      sections.push(messages.promptBuilder.sections.toneAndStyle);
      sections.push(params.tone.guidelines);
      sections.push("");
    }

    // Add output format section without multi-variant instructions
    sections.push(messages.promptBuilder.sections.outputFormat);
    const outputInstructions = buildOutputInstructions(template);
    sections.push(outputInstructions);
  }

  // Join all sections and normalize whitespace
  return normalizeWhitespace(sections.join("\n"));
}

/**
 * Builds output format instructions including variant handling
 * Uses hardcoded values: variantSeparator = "---", includeSeparatorForSingle = false
 */
function buildOutputInstructions(template: PromptTemplate): string {
  const instructions: string[] = [];

  // Add base output format instructions
  if (template.sections.output) {
    instructions.push(template.sections.output);
  }

  // No multi-variant instructions; always single-variant behavior

  return instructions.join("");
}

/**
 * Normalizes whitespace in the generated prompt
 */
function normalizeWhitespace(text: string): string {
  return (
    text
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{3,}/g, "\n\n")
      // Trim leading and trailing whitespace
      .trim()
      // Ensure consistent line endings
      .replace(/\r\n/g, "\n")
  );
}
/**
 * Utility function to validate template and params before building
 */
export function validateBuildParams(template: PromptTemplate, params: PromptBuildParams): boolean {
  if (!template.sections.instructions) {
    throw new Error(messages.promptBuilder.validation.templateMustHaveInstructions);
  }

  if (!params.text?.trim()) {
    throw new Error(messages.promptBuilder.validation.textParameterEmpty);
  }

  return true;
}
