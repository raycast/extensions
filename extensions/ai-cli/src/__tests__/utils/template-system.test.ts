import { describe, expect, it } from "vitest";
import { getAllBuiltInTemplates, getBuiltInTemplate, isBuiltInTemplate } from "@/templates/built-in-templates";
import { buildPrompt, createPromptTemplate } from "@/templates/prompt-builder";
import type { PromptBuildParams } from "@/types/prompt-template";

describe("Template System", () => {
  describe("Built-in Templates", () => {
    it("provides access to built-in templates", () => {
      const slackTemplate = getBuiltInTemplate("slack");
      expect(slackTemplate).toBeDefined();
      expect(slackTemplate?.name).toBe("Slack");
      expect(slackTemplate?.isBuiltIn).toBe(true);

      const prTemplate = getBuiltInTemplate("code-review");
      expect(prTemplate).toBeDefined();
      expect(prTemplate?.name).toBe("Code Review");
      expect(prTemplate?.isBuiltIn).toBe(true);
    });

    it("identifies built-in templates correctly", () => {
      expect(isBuiltInTemplate("slack")).toBe(true);
      expect(isBuiltInTemplate("code-review")).toBe(true);
      expect(isBuiltInTemplate("custom")).toBe(true);
      expect(isBuiltInTemplate("non-existent")).toBe(false);
    });

    it("returns all built-in templates", () => {
      const templates = getAllBuiltInTemplates();
      expect(templates.length).toBe(6);

      const templateIds = templates.map((t) => t.id);
      expect(templateIds).toContain("slack");
      expect(templateIds).toContain("code-review");
      expect(templateIds).toContain("email");
      expect(templateIds).toContain("bug-report");
      expect(templateIds).toContain("technical-docs");
      expect(templateIds).toContain("custom");
    });
  });

  describe("Prompt Building", () => {
    it("builds prompts with variable substitution", () => {
      const template = getBuiltInTemplate("slack");
      expect(template).toBeDefined();

      const params: PromptBuildParams = {
        text: "Hello world",
        tone: {
          name: "Professional",
          guidelines: "Be formal and professional",
        },
        context: "Additional context",
      };

      const result = buildPrompt(template!, params);

      expect(result).toContain("Hello world");
      expect(result).toContain("Be formal and professional");
      expect(result).toContain("Additional context");
      expect(result).toContain("## Instructions");
      expect(result).toContain("## Text");
    });

    it("handles minimal parameters gracefully", () => {
      const template = getBuiltInTemplate("slack");
      expect(template).toBeDefined();

      const params: PromptBuildParams = {
        text: "Test message",
        tone: {
          name: "Brief",
          guidelines: "",
        },
      };

      const result = buildPrompt(template!, params);

      expect(result).toContain("Test message");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("## Instructions");
      expect(result).toContain("## Output Format");
    });
  });

  describe("Custom Template Creation", () => {
    it("creates and processes custom templates with all sections", () => {
      const customTemplate = createPromptTemplate(
        "email-template",
        "Email Template",
        {
          instructions: "Write a professional email based on the provided content.",
          requirements:
            "- Use proper email formatting\n- Include appropriate greetings and closings\n- Be concise and clear",
          output: "Format as a complete email ready to send.",
        },
        undefined,
        false
      );

      const params: PromptBuildParams = {
        text: "Please send the report",
        tone: {
          name: "Business",
          guidelines: "Use business-appropriate language",
        },
      };

      const result = buildPrompt(customTemplate, params);

      expect(result).toContain("Please send the report");
      expect(result).toContain("Use business-appropriate language");
      expect(result).toContain("## Instructions");
      expect(result).toContain("Write a professional email");
    });
  });
});
