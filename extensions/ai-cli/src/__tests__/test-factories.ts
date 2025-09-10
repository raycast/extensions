/**
 * Test Data Factories - Hybrid Approach
 *
 * Combines the simplicity of factory functions with the flexibility
 * of builder patterns where they add value. Provides both simple factories
 * for basic scenarios and builders for complex test cases.
 */

import type { CustomTemplate } from "@/hooks/useCustomTemplates";
import type { CustomTone } from "@/hooks/useCustomTones";
import type { FormValues } from "@/types";
import type { PromptBuildParams } from "@/types/prompt-template";

/**
 * Creates a custom template with sensible defaults
 */
export const createTemplate = (overrides: Partial<CustomTemplate> = {}): CustomTemplate => ({
  id: `test-template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test Template",
  sections: {
    instructions: "Format the following text: {text}",
  },
  isBuiltIn: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a custom tone with sensible defaults
 */
export const createTone = (overrides: Partial<CustomTone> = {}): CustomTone => ({
  id: `test-tone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test Tone",
  guidelines: "Use a test tone in your response",
  isBuiltIn: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates form values with sensible defaults
 */
export const createFormValues = (overrides: Partial<FormValues> = {}): FormValues => ({
  selectedAgent: "claude",
  template: "slack",
  tone: "professional",
  model: "Sonnet 4.0",
  textInput: "Sample text for testing",
  additionalContext: "",
  targetFolder: "",
  ...overrides,
});

// ===== QUICK FACTORIES FOR COMMON SCENARIOS =====

export const Templates = {
  slack: () =>
    createTemplate({
      id: "slack",
      name: "Slack Message",
      sections: { instructions: "Format this text for Slack: {text}" },
    }),

  email: () =>
    createTemplate({
      id: "email",
      name: "Email",
      sections: { instructions: "Format this text as an email: {text}" },
    }),
};

export const Tones = {
  professional: () =>
    createTone({
      id: "professional",
      name: "Professional",
      guidelines: "Use formal language and proper structure",
    }),

  casual: () =>
    createTone({
      id: "casual",
      name: "Casual",
      guidelines: "Use friendly, conversational language",
    }),

  technical: () =>
    createTone({
      id: "technical",
      name: "Technical",
      guidelines: "Use precise technical terminology",
    }),
};

// ===== BUILDER PATTERN FOR COMPLEX SCENARIOS =====

/**
 * Builder for complex template scenarios requiring fluent configuration
 * Use this for integration tests and complex setups
 */
export class TemplateBuilder {
  private readonly template: CustomTemplate;

  constructor(base?: Partial<CustomTemplate>) {
    this.template = createTemplate(base);
  }

  // Static factory methods for common complex scenarios
  static slack(): TemplateBuilder {
    return new TemplateBuilder()
      .withId("slack")
      .withName("Slack Message")
      .withInstructions("Format this text for Slack messaging: {text}")
      .asBuiltIn();
  }

  static complex(): TemplateBuilder {
    return new TemplateBuilder()
      .withName("Complex Template")
      .withInstructions("Process the text according to requirements.")
      .withRequirements("Follow these specific requirements")
      .withOutput("Format the output as clean text");
  }

  // Static methods for prompt-builder test compatibility
  static full(): TemplateBuilder {
    return new TemplateBuilder()
      .withId("test-full")
      .withName("Full Test Template")
      .withInstructions("Instructions with {text}")
      .withRequirements("Requirements")
      .withOutput("Output format")
      .asBuiltIn();
  }

  static minimal(): TemplateBuilder {
    return new TemplateBuilder()
      .withId("test-minimal")
      .withName("Minimal Test Template")
      .withInstructions("Process this text")
      .asBuiltIn();
  }

  withId(id: string): TemplateBuilder {
    this.template.id = id;
    return this;
  }

  withName(name: string): TemplateBuilder {
    this.template.name = name;
    return this;
  }

  withInstructions(instructions: string): TemplateBuilder {
    if (!this.template.sections) {
      this.template.sections = { instructions: "" };
    }
    this.template.sections.instructions = instructions;
    return this;
  }

  withRequirements(requirements: string): TemplateBuilder {
    if (!this.template.sections) {
      this.template.sections = { instructions: "" };
    }
    this.template.sections.requirements = requirements;
    return this;
  }

  withOutput(output: string): TemplateBuilder {
    if (!this.template.sections) {
      this.template.sections = { instructions: "" };
    }
    this.template.sections.output = output;
    return this;
  }

  asBuiltIn(): TemplateBuilder {
    this.template.isBuiltIn = true;
    return this;
  }

  withIcon(icon: string): TemplateBuilder {
    this.template.icon = icon;
    return this;
  }

  build(): CustomTemplate {
    // Ensure sections is defined with required instructions
    const sections = this.template.sections || { instructions: "Default instructions" };
    if (!sections.instructions) {
      sections.instructions = "Default instructions";
    }

    return {
      ...this.template,
      sections: { ...sections },
    };
  }
}

// ===== PROMPT BUILDER TEST COMPATIBILITY =====

/**
 * Factory for PromptBuildParams objects - simple approach for test compatibility
 */
export const PromptParamsBuilder = {
  full: () => ({
    build: (): PromptBuildParams => ({
      text: "Hello world",
      tone: { name: "Formal", guidelines: "Use formal language" },
      context: "Business communication context",
    }),
  }),
  minimal: () => ({
    build: (): PromptBuildParams => ({
      text: "Hello world",
    }),
  }),
};
