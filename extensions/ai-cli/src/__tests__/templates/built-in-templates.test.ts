import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_TEMPLATE,
  BUILT_IN_TEMPLATES,
  CODE_REVIEW_TEMPLATE,
  CUSTOM_TEMPLATE,
  EMAIL_TEMPLATE,
  getAllBuiltInTemplates,
  getBuiltInTemplate,
  getBuiltInTemplateIds,
  isBuiltInTemplate,
  SLACK_TEMPLATE,
  TECHNICAL_DOCS_TEMPLATE,
} from "@/templates/built-in-templates";
import { buildPrompt } from "@/templates/prompt-builder";
import { validatePromptTemplate } from "@/utils/validation";
import type { PromptBuildParams } from "@/types/prompt-template";

// Test data for reusability
const TEST_PARAMS: PromptBuildParams = {
  text: "Test message for validation",
  tone: { name: "Professional", guidelines: "Use formal language" },
  context: "Test context",
};

const TEMPLATE_TEST_CASES = [
  { template: SLACK_TEMPLATE, id: "slack", name: "Slack", contentKeyword: "Slack communication" },
  { template: CODE_REVIEW_TEMPLATE, id: "code-review", name: "Code Review", contentKeyword: "pull requests" },
  { template: EMAIL_TEMPLATE, id: "email", name: "Email", contentKeyword: "professional business email" },
  { template: BUG_REPORT_TEMPLATE, id: "bug-report", name: "Bug Report", contentKeyword: "comprehensive bug report" },
  {
    template: TECHNICAL_DOCS_TEMPLATE,
    id: "technical-docs",
    name: "Technical Documentation",
    contentKeyword: "technical documentation",
  },
  { template: CUSTOM_TEMPLATE, id: "custom", name: "None", contentKeyword: "", skipContentValidation: true },
];

describe("Built-in Templates", () => {
  describe("Template Structure and Content Validation", () => {
    it.each(TEMPLATE_TEST_CASES)(
      "validates $name template structure and content",
      ({ template, id, name, contentKeyword, skipContentValidation }) => {
        // Structure validation - custom template is intentionally empty
        if (id !== "custom") {
          expect(() => validatePromptTemplate(template)).not.toThrow();
        }
        expect(template.id).toBe(id);
        expect(template.name).toBe(name);
        expect(template.isBuiltIn).toBe(true);

        // None template can have empty sections as it's a placeholder
        if (template.id === "custom") {
          expect(template.sections.output).toBe("");
          expect(template.sections.instructions).toBe("");
        } else {
          expect(template.sections.instructions).toBeTruthy();
          expect(template.sections.output).toBeTruthy();
        }

        // Content validation - skip for custom template
        if (!skipContentValidation && contentKeyword) {
          expect(template.sections.instructions).toContain(contentKeyword);
        }
      }
    );

    it("ensures all templates have required sections and placeholders", () => {
      const templates = getAllBuiltInTemplates();

      templates.forEach((template) => {
        // None template is intentionally empty as a placeholder
        if (template.id !== "custom") {
          expect(template.sections.instructions.trim()).not.toBe("");
          expect(template.sections.output).toBeTruthy();
        } else {
          expect(template.sections.instructions).toBe("");
          expect(template.sections.output).toBe("");
        }
        expect(template.isBuiltIn).toBe(true);
      });
    });
  });

  describe("Template Access Functions", () => {
    it("provides complete template access functionality", () => {
      // Template retrieval
      expect(getBuiltInTemplate("slack")).toBe(SLACK_TEMPLATE);
      expect(getBuiltInTemplate("code-review")).toBe(CODE_REVIEW_TEMPLATE);
      expect(getBuiltInTemplate("email")).toBe(EMAIL_TEMPLATE);
      expect(getBuiltInTemplate("bug-report")).toBe(BUG_REPORT_TEMPLATE);
      expect(getBuiltInTemplate("technical-docs")).toBe(TECHNICAL_DOCS_TEMPLATE);
      expect(getBuiltInTemplate("custom")).toBe(CUSTOM_TEMPLATE);
      expect(getBuiltInTemplate("non-existent")).toBeUndefined();

      // Template ID management
      const ids = getBuiltInTemplateIds();
      expect(ids).toEqual(["custom", "slack", "code-review", "email", "bug-report", "technical-docs"]);

      // Template identification
      expect(isBuiltInTemplate("slack")).toBe(true);
      expect(isBuiltInTemplate("user-custom")).toBe(false);
      expect(isBuiltInTemplate("")).toBe(false);

      // Template collection
      const templates = getAllBuiltInTemplates();
      expect(templates).toHaveLength(6);
      expect(templates.every((t) => t.isBuiltIn)).toBe(true);

      // Referential integrity
      expect(BUILT_IN_TEMPLATES.slack).toBe(SLACK_TEMPLATE);
      expect(BUILT_IN_TEMPLATES["code-review"]).toBe(CODE_REVIEW_TEMPLATE);
    });
  });

  describe("Template Integration with Prompt Builder", () => {
    it.each([
      { template: SLACK_TEMPLATE, id: "slack", name: "Slack", contentKeyword: "emoji" },
      { template: CODE_REVIEW_TEMPLATE, id: "code-review", name: "Code Review", contentKeyword: "pull requests" },
      { template: EMAIL_TEMPLATE, id: "email", name: "Email", contentKeyword: "professional business email" },
      {
        template: BUG_REPORT_TEMPLATE,
        id: "bug-report",
        name: "Bug Report",
        contentKeyword: "comprehensive bug report",
      },
      {
        template: TECHNICAL_DOCS_TEMPLATE,
        id: "technical-docs",
        name: "Technical Documentation",
        contentKeyword: "technical documentation",
      },
    ])("builds $name prompts correctly with all parameters", ({ template, contentKeyword }) => {
      const result = buildPrompt(template, TEST_PARAMS);

      expect(result).toContain(contentKeyword);
      expect(result).toContain("Use formal language");
      expect(result).toContain("Test context");
      expect(result).toContain("Test message for validation");
    });

    it("builds None prompts with special minimal behavior", () => {
      const result = buildPrompt(CUSTOM_TEMPLATE, TEST_PARAMS);

      // None format uses input text as instructions, not template instructions
      expect(result).toContain("## Instructions");
      expect(result).toContain("Test message for validation"); // Input text becomes instructions
      expect(result).toContain("Test context"); // Context is included

      // None format includes tone when provided and doesn't include template sections
      expect(result).not.toContain("user-defined"); // Template instructions not used
      expect(result).toContain("Use formal language"); // Tone is included when provided
      expect(result).not.toContain("## Text"); // No text to process section
      expect(result).not.toContain("## Requirements"); // No requirements section
      expect(result).toContain("## Tone & Style"); // Tone section is included when tone provided
      expect(result).not.toContain("## Output Format"); // No output format for single variant
    });

    it("handles optional parameters with single-variant output", () => {
      const minimalParams: PromptBuildParams = { text: "Simple test" };

      // Test minimal parameters
      const minimalResult = buildPrompt(SLACK_TEMPLATE, minimalParams);
      expect(minimalResult).toContain("Simple test");
      expect(minimalResult).not.toContain("## Tone & Style");
      expect(minimalResult).not.toContain("## Context");
    });
  });

  describe("Template Consistency and Quality", () => {
    it("ensures all templates meet quality standards", () => {
      const templates = getAllBuiltInTemplates();
      const testParams: PromptBuildParams = { text: "Test content" };

      templates.forEach((template) => {
        // ID format consistency
        expect(template.id).toMatch(/^[a-z][a-z0-9-]*$/);
        expect(template.id).not.toContain("_");

        // Name quality
        expect(template.name.trim()).not.toBe("");
        expect(template.name.length).toBeGreaterThan(2);

        // Output format presence
        // None template can have empty output section per Comment 35
        if (template.id === "custom") {
          expect(template.sections.output).toBe("");
        } else {
          expect(template.sections.output).toBeTruthy();
        }

        // Prompt generation works
        const result = buildPrompt(template, testParams);
        expect(result).toBeTruthy();
        expect(result).toContain("## Instructions");
        expect(result).toContain("Test content");

        // None template has special minimal behavior
        if (template.id === "custom") {
          // None format uses input text as instructions and has minimal sections
          expect(result).not.toContain("## Text");
          expect(result).not.toContain("## Output Format"); // Single variant custom doesn't include output format
        } else {
          // Standard templates include all expected sections
          expect(result).toContain("## Text");
          expect(result).toContain("## Output Format");
        }
      });
    });
  });

  describe("Template Differentiation", () => {
    it("templates produce unique prompts with distinct characteristics", () => {
      const testParams: PromptBuildParams = {
        text: "Test content",
        tone: { name: "Casual", guidelines: "Be friendly" },
        context: "Technical discussion",
      };

      const slackResult = buildPrompt(SLACK_TEMPLATE, testParams);
      const prResult = buildPrompt(CODE_REVIEW_TEMPLATE, testParams);
      const customResult = buildPrompt(CUSTOM_TEMPLATE, testParams);

      // Each template produces different output
      expect(slackResult).not.toBe(prResult);
      expect(slackResult).not.toBe(customResult);
      expect(prResult).not.toBe(customResult);

      // Templates have distinct characteristics
      expect(slackResult).toContain("emoji");
      expect(prResult).toContain("pull requests");
      // None template uses input text as instructions, not template instructions
      expect(customResult).toContain("Test content"); // Input text becomes the instructions
      expect(customResult).not.toContain("user-defined"); // Template instructions not used

      // Context handling varies appropriately
      expect(slackResult).toContain("Technical discussion");
      expect(prResult).toContain("Technical discussion");
    });
  });

  describe("Edge Cases and System Behavior", () => {
    it("handles edge cases and maintains system integrity", () => {
      // Empty/invalid template access
      expect(getBuiltInTemplate("")).toBeUndefined();
      expect(isBuiltInTemplate("")).toBe(false);

      // Special characters in IDs (hyphenated IDs)
      expect(getBuiltInTemplate("code-review")).toBeDefined();
      expect(isBuiltInTemplate("code-review")).toBe(true);

      // Collection consistency
      const templates1 = getAllBuiltInTemplates();
      const templates2 = getAllBuiltInTemplates();
      expect(templates1).toEqual(templates2);
      expect(templates1[0]).toBe(templates2[0]); // Same reference

      // Constant type validation
      expect(typeof BUILT_IN_TEMPLATES).toBe("object");
      expect(BUILT_IN_TEMPLATES).not.toBeNull();
      expect(Array.isArray(BUILT_IN_TEMPLATES)).toBe(false);
    });
  });

  describe("End-to-End Template Workflows", () => {
    it("supports complete formatting workflows with custom prompts", () => {
      const workflowParams: PromptBuildParams = {
        text: "Feature implementation completed",
        tone: { name: "Technical", guidelines: "Be precise and detailed" },
        context: "Development team update",
      };

      const slackResult = buildPrompt(SLACK_TEMPLATE, workflowParams);
      const prResult = buildPrompt(CODE_REVIEW_TEMPLATE, workflowParams);
      const customResult = buildPrompt(CUSTOM_TEMPLATE, workflowParams);

      // Standard templates handle the complete workflow
      [slackResult, prResult].forEach((result) => {
        expect(result).toContain("Feature implementation completed");
        expect(result).toContain("Be precise and detailed");
        expect(result).toContain("Development team update");
        expect(result).not.toContain("Generate exactly 2 distinct variants");
      });

      // None template has special behavior - uses input as instructions, includes tone
      expect(customResult).toContain("Feature implementation completed"); // Input text becomes instructions
      expect(customResult).toContain("Be precise and detailed"); // Tone is included in custom format
      expect(customResult).toContain("Development team update"); // Context is included
      expect(customResult).not.toContain("Generate exactly 2 distinct variants");

      // Each template maintains its unique characteristics
      expect(slackResult).toContain("Slack communication");
      expect(prResult).toContain("pull requests");
      // None format doesn't contain template instructions, only the processed input text
      expect(customResult).not.toContain("user-defined requirements");
    });
  });
});
