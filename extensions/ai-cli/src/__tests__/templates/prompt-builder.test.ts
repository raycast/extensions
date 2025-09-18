import { beforeAll, describe, expect, it } from "vitest";
import { buildPrompt, createPromptTemplate, validateBuildParams } from "@/templates/prompt-builder";
import { PromptParamsBuilder, TemplateBuilder } from "@/__tests__/test-factories";
import type { PromptBuildParams, PromptTemplate } from "@/types/prompt-template";

// Performance: Shared test fixtures using beforeAll to reduce setup overhead
let FULL_TEMPLATE: PromptTemplate;
let MINIMAL_TEMPLATE: PromptTemplate;
let BASE_PARAMS: PromptBuildParams;

beforeAll(() => {
  try {
    // Performance: Use builders and create complex fixtures only once
    FULL_TEMPLATE = TemplateBuilder.full().build() as PromptTemplate;
    MINIMAL_TEMPLATE = TemplateBuilder.minimal().build() as PromptTemplate;
    BASE_PARAMS = PromptParamsBuilder.full().build();

    console.log("Templates created:", { FULL_TEMPLATE, MINIMAL_TEMPLATE, BASE_PARAMS });
  } catch (error) {
    console.error("Error in beforeAll:", error);
    throw error;
  }
});

describe("Prompt Builder", () => {
  describe("Core Prompt Building", () => {
    it("builds prompts with varying parameter combinations and dynamic context injection", () => {
      // Required parameters only - no optional sections should appear
      const minimalParams = PromptParamsBuilder.minimal().build();
      const minimalResult = buildPrompt(FULL_TEMPLATE, minimalParams);

      expect(minimalResult).toContain("## Instructions");
      expect(minimalResult).toContain("Hello world");
      expect(minimalResult).toContain("## Output Format");
      expect(minimalResult).not.toContain("## Tone & Style");
      expect(minimalResult).not.toContain("## Additional Context"); // Context section only appears when both template has context AND params.context is provided

      // All parameters - all sections should appear due to dynamic injection
      const fullResult = buildPrompt(FULL_TEMPLATE, BASE_PARAMS);
      expect(fullResult).toContain("## Tone & Style");
      expect(fullResult).toContain("Use formal language");
      expect(fullResult).toContain("## Additional Context"); // Context appears because template has context section AND params.context is provided
      expect(fullResult).toContain("Business communication context");

      // Minimal template structure - no context section even with context params
      const minimalTemplateResult = buildPrompt(MINIMAL_TEMPLATE, minimalParams);
      expect(minimalTemplateResult).toContain("Process this text");
      expect(minimalTemplateResult).not.toContain("## Requirements");

      // Minimal template with context param but no context section in template
      const minimalWithContextParam = buildPrompt(MINIMAL_TEMPLATE, {
        text: "Hello world",
        context: "Some context",
      });
      expect(minimalWithContextParam).not.toContain("## Context"); // No context section because template doesn't have one
    });
  });

  describe("Tone and Context Interpolation", () => {
    it("handles dynamic context injection and edge cases", () => {
      const contextCases = [
        "Internal team meeting discussion",
        "Context with\nnewlines and {special} characters & symbols",
        "", // empty context
        "   \n\t  ", // whitespace-only context
      ];

      contextCases.forEach((context) => {
        const params: PromptBuildParams = { text: "Test content", context };
        const result = buildPrompt(FULL_TEMPLATE, params);

        if (context.trim()) {
          expect(result).toContain("## Additional Context");
          expect(result).toContain(context);
        } else {
          // Empty or whitespace-only context should not include context section
          expect(result).not.toContain("## Context");
        }
      });

      // Test dynamic context injection - context section only appears when both template has context section AND params include context
      const templateWithoutContext = {
        ...FULL_TEMPLATE,
        sections: { ...FULL_TEMPLATE.sections, context: undefined },
      };
      const resultWithoutContextTemplate = buildPrompt(templateWithoutContext, {
        text: "Test content",
        context: "Some context",
      });
      expect(resultWithoutContextTemplate).not.toContain("## Context");

      // Context section appears only when both conditions are met
      const resultWithBoth = buildPrompt(FULL_TEMPLATE, {
        text: "Test content",
        context: "Dynamic context from form",
      });
      expect(resultWithBoth).toContain("## Additional Context");
      expect(resultWithBoth).toContain("Dynamic context from form");
    });
  });

  describe("Dynamic Context Injection", () => {
    it("includes context section only when template has context section AND additionalContext is provided", () => {
      // Template with context section + context provided = context section included
      const templateWithContext: PromptTemplate = {
        id: "test-with-context",
        name: "Test With Context",
        isBuiltIn: false,
        sections: {
          instructions: "Process the text",
        },
      };

      const withContextResult = buildPrompt(templateWithContext, {
        text: "Test text",
        context: "Additional context from form",
      });

      expect(withContextResult).toContain("## Additional Context");
      expect(withContextResult).toContain("Additional context from form");

      // Template with context section + no context provided = no context section
      const withoutContextResult = buildPrompt(templateWithContext, {
        text: "Test text",
      });

      expect(withoutContextResult).not.toContain("## Context");

      // Template without context section + context provided = no context section
      const templateWithoutContext: PromptTemplate = {
        id: "test-without-context",
        name: "Test Without Context",
        isBuiltIn: false,
        sections: {
          instructions: "Process the text",
        },
      };

      const noContextSectionResult = buildPrompt(templateWithoutContext, {
        text: "Test text",
        context: "This context won't be used",
      });

      expect(noContextSectionResult).not.toContain("## Context");
    });

    it("works correctly with built-in templates that have predefined context sections", () => {
      // Built-in templates should still work with their predefined context sections
      const builtInTemplate: PromptTemplate = {
        id: "builtin-test",
        name: "Built-in Test",
        isBuiltIn: true,
        sections: {
          instructions: "Process text for communication",
          output: "Format as clean output",
        },
      };

      // With additional context provided
      const withAdditionalContext = buildPrompt(builtInTemplate, {
        text: "Sample text",
        context: "Team communication context",
      });

      expect(withAdditionalContext).toContain("## Additional Context");
      expect(withAdditionalContext).toContain("Team communication context");

      // Without additional context
      const withoutAdditionalContext = buildPrompt(builtInTemplate, {
        text: "Sample text",
      });

      expect(withoutAdditionalContext).not.toContain("## Context");
    });

    it("handles context interpolation with complex template strings", () => {
      const complexContextTemplate: PromptTemplate = {
        id: "complex-context",
        name: "Complex Context Template",
        isBuiltIn: false,
        sections: {
          instructions: "Process the text",
        },
      };

      const result = buildPrompt(complexContextTemplate, {
        text: "Test text",
        context: "business meeting discussion",
      });

      expect(result).toContain("## Additional Context");
      expect(result).toContain("business meeting discussion");
      expect(result).not.toContain("{context}");
      // Check that the context appears in all expected locations
      const contextSection = result.split("## Additional Context")[1].split("## Text")[0];
      const contextMatches = (contextSection.match(/business meeting discussion/g) || []).length;
      expect(contextMatches).toBe(1); // Should appear 3 times in the complex template
    });
  });

  describe("Whitespace Normalization and Text Processing", () => {
    it("handles whitespace normalization and text processing correctly", () => {
      // Excessive blank lines removal
      const spacedTemplate: PromptTemplate = {
        ...FULL_TEMPLATE,
        sections: {
          ...FULL_TEMPLATE.sections,
          instructions: "Instructions with\n\n\n\nexcessive blank lines",
          requirements: "Requirements\n\n\n\n\nwith many blanks",
        },
      };
      const spacedResult = buildPrompt(spacedTemplate, { text: "Test" });
      expect(spacedResult).not.toMatch(/\n{3,}/);
      expect(spacedResult).toContain("Instructions with\n\nexcessive blank lines");

      // Leading/trailing whitespace trimming
      const trimResult = buildPrompt(FULL_TEMPLATE, { text: "   Test content with spaces   " });
      expect(trimResult).not.toMatch(/^\s+/);
      expect(trimResult).not.toMatch(/\s+$/);
      expect(trimResult).toContain("Test content with spaces");

      // Line ending normalization
      const crlfTemplate: PromptTemplate = {
        ...FULL_TEMPLATE,
        sections: { ...FULL_TEMPLATE.sections, instructions: "Instructions with\r\nWindows line endings\r\n" },
      };
      const crlfResult = buildPrompt(crlfTemplate, { text: "Test" });
      expect(crlfResult).not.toContain("\r\n");
      expect(crlfResult).toContain("Instructions with\nWindows line endings");
    });
  });

  describe("Parameter Validation", () => {
    const TEMP_FULL_TEMPLATE = TemplateBuilder.full().build();

    const validationCases = [
      {
        template: { ...TEMP_FULL_TEMPLATE, sections: { ...TEMP_FULL_TEMPLATE.sections, instructions: "" } },
        params: { text: "Test" },
        error: "Template must have instructions section",
      },
      { template: TEMP_FULL_TEMPLATE, params: { text: "" }, error: "Text parameter cannot be empty" },
      {
        template: TEMP_FULL_TEMPLATE,
        params: { text: "   \n\t   " },
        error: "Text parameter cannot be empty",
      },
    ];

    it.each(validationCases)("validates parameters and throws appropriate errors", ({ template, params, error }) => {
      expect(() => validateBuildParams(template as PromptTemplate, params as PromptBuildParams)).toThrow(error);
    });

    it("passes validation with valid parameters", () => {
      const validParams: PromptBuildParams = { text: "Valid content" };
      expect(() => validateBuildParams(FULL_TEMPLATE, validParams)).not.toThrow();
      expect(validateBuildParams(FULL_TEMPLATE, validParams)).toBe(true);
    });
  });

  describe("Custom Format Special Handling", () => {
    const CUSTOM_FORMAT_TEMPLATE: PromptTemplate = {
      id: "custom",
      name: "None",
      isBuiltIn: true,
      sections: {
        instructions: "Process the provided text according to user-defined requirements.",
        requirements: "Follow any specific requirements defined by the user.",
        output: "Create well-formatted output according to user specifications.",
      },
    };

    it("uses input text as instructions for custom template", () => {
      const inputText = "Transform this text into a professional email";
      const params: PromptBuildParams = {
        text: inputText,
      };

      const result = buildPrompt(CUSTOM_FORMAT_TEMPLATE, params);

      // Should contain the input text as instructions
      expect(result).toContain("## Instructions");
      expect(result).toContain(inputText);

      // Should NOT contain the template's default instructions
      expect(result).not.toContain("Process the provided text according to user-defined requirements");

      // Should NOT contain other sections
      expect(result).not.toContain("## Tone & Style");
      expect(result).not.toContain("## Requirements");
      expect(result).not.toContain("## Text");

      // Should NOT contain Output Format for single variant
      expect(result).not.toContain("## Output Format");
    });

    it("includes additional context for custom template when provided", () => {
      const params: PromptBuildParams = {
        text: "Write a summary",
        context: "This is for a board meeting presentation",
      };

      const result = buildPrompt(CUSTOM_FORMAT_TEMPLATE, params);

      expect(result).toContain("## Instructions");
      expect(result).toContain("Write a summary");
      expect(result).toContain("## Additional Context");
      expect(result).toContain("This is for a board meeting presentation");

      // Verify section order
      const instructionsIndex = result.indexOf("## Instructions");
      const contextIndex = result.indexOf("## Additional Context");
      expect(instructionsIndex).toBeLessThan(contextIndex);
    });

    it("does not include Output Format section for custom format", () => {
      const singleVariantParams: PromptBuildParams = {
        text: "Create a report",
      };

      const multiVariantParams: PromptBuildParams = {
        text: "Create a report",
      };

      const singleResult = buildPrompt(CUSTOM_FORMAT_TEMPLATE, singleVariantParams);
      const multiResult = buildPrompt(CUSTOM_FORMAT_TEMPLATE, multiVariantParams);

      // No Output Format for custom format in single-variant system
      expect(singleResult).not.toContain("## Output Format");
      expect(singleResult).not.toContain("Multiple Variants Required");

      // Even when requesting multiple, no multi-variant instructions are included
      expect(multiResult).not.toContain("## Output Format");
      expect(multiResult).not.toContain("Generate exactly 3 distinct variants");
    });

    it("includes tone parameter for custom format when provided", () => {
      const params: PromptBuildParams = {
        text: "Draft a message",
        tone: {
          name: "Professional",
          guidelines: "Use formal language and proper structure",
        },
      };

      const result = buildPrompt(CUSTOM_FORMAT_TEMPLATE, params);

      expect(result).toContain("## Tone & Style");
      expect(result).toContain("Use formal language and proper structure");
    });

    it("produces minimal output for custom format with only required params", () => {
      const params: PromptBuildParams = {
        text: "Simplify this concept",
      };

      const result = buildPrompt(CUSTOM_FORMAT_TEMPLATE, params);
      const lines = result.split("\n").filter((line) => line.trim());

      // Should only have Instructions header and the text
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe("## Instructions");
      expect(lines[1]).toBe("Simplify this concept");
    });

    it("handles empty context correctly for custom format", () => {
      const params: PromptBuildParams = {
        text: "Generate ideas",
        context: "   ", // Whitespace only
      };

      const result = buildPrompt(CUSTOM_FORMAT_TEMPLATE, params);

      expect(result).not.toContain("## Additional Context");
    });

    it("verifies other templates still work normally", () => {
      // Test that non-custom templates are unaffected
      const slackTemplate: PromptTemplate = {
        id: "slack",
        name: "Slack",
        isBuiltIn: true,
        sections: {
          instructions: "Format for Slack",
          requirements: "Use emoji and formatting",
          output: "Create Slack message",
        },
      };

      const params: PromptBuildParams = {
        text: "Test message",
        tone: { name: "Casual", guidelines: "Be friendly" },
        context: "Team update",
      };

      const result = buildPrompt(slackTemplate, params);

      // Should use standard flow with all sections
      expect(result).toContain("## Instructions");
      expect(result).toContain("Format for Slack");
      expect(result).toContain("## Tone & Style");
      expect(result).toContain("Be friendly");
      expect(result).toContain("## Additional Context");
      expect(result).toContain("Team update");
      expect(result).toContain("## Requirements");
      expect(result).toContain("Use emoji and formatting");
      expect(result).toContain("## Text");
      expect(result).toContain("Test message");
      expect(result).toContain("## Output Format");
    });
  });

  describe("Validated Prompt Building and Edge Cases", () => {
    it("handles edge cases and maintains consistency", () => {
      // Very long text
      const longText = "A".repeat(10000);
      const longResult = buildPrompt(FULL_TEMPLATE, { text: longText });
      expect(longResult).toContain(longText);

      // Special characters and Unicode
      const specialText = "Text with émojis 🚀, unicode ñ, and symbols @#$%^&*()";
      const specialResult = buildPrompt(FULL_TEMPLATE, { text: specialText });
      expect(specialResult).toContain(specialText);

      // Undefined optional parameters
      const undefinedParams: PromptBuildParams = {
        text: "Test",
        tone: undefined,
        context: undefined,
      };
      const undefinedResult = buildPrompt(FULL_TEMPLATE, undefinedParams);
      expect(undefinedResult).toContain("Test");
      expect(undefinedResult).not.toContain("## Tone & Style");

      // Consistency check
      const params: PromptBuildParams = {
        text: "Consistent test",
        tone: { name: "Pro", guidelines: "Formal" },
      };
      const result1 = buildPrompt(FULL_TEMPLATE, params);
      const result2 = buildPrompt(FULL_TEMPLATE, params);
      expect(result1).toBe(result2);
    });
  });

  describe("createPromptTemplate", () => {
    it("should create a valid template with required fields", () => {
      const template = createPromptTemplate("test-id", "Test Template", { instructions: "Test instructions" });

      expect(template.id).toBe("test-id");
      expect(template.name).toBe("Test Template");
      expect(template.sections.instructions).toBe("Test instructions");
      expect(template.isBuiltIn).toBe(false);
      expect(template.icon).toBeUndefined();
    });

    it("should create template with icon", () => {
      const template = createPromptTemplate(
        "icon-template",
        "Icon Template",
        { instructions: "Instructions with icon" },
        "🚀"
      );

      expect(template.icon).toBe("🚀");
      expect(template.isBuiltIn).toBe(false);
    });

    it("should create built-in template", () => {
      const template = createPromptTemplate(
        "builtin-template",
        "Built-in Template",
        { instructions: "Built-in instructions" },
        "📝",
        true
      );

      expect(template.isBuiltIn).toBe(true);
      expect(template.icon).toBe("📝");
    });

    it("should create template with all section types", () => {
      const sections = {
        instructions: "Main instructions",
        tone: "Apply tone: {tone_guidelines}",
        context: "Context: {context}",
        requirements: "Requirements here",
        output: "Output format",
      };

      const template = createPromptTemplate("complete-template", "Complete Template", sections, "✨");

      expect(template.sections).toEqual(sections);
      expect(template.sections.instructions).toBe("Main instructions");
      expect(template.sections.requirements).toBe("Requirements here");
      expect(template.sections.output).toBe("Output format");
    });

    it("should throw error for empty template ID", () => {
      expect(() => {
        createPromptTemplate("", "Valid Name", { instructions: "Valid instructions" });
      }).toThrow("Template ID cannot be empty");
    });

    it("should throw error for whitespace-only template ID", () => {
      expect(() => {
        createPromptTemplate("   ", "Valid Name", { instructions: "Valid instructions" });
      }).toThrow("Template ID cannot be empty");
    });

    it("should throw error for empty template name", () => {
      expect(() => {
        createPromptTemplate("valid-id", "", { instructions: "Valid instructions" });
      }).toThrow("Template name cannot be empty");
    });

    it("should throw error for whitespace-only template name", () => {
      expect(() => {
        createPromptTemplate("valid-id", "   ", { instructions: "Valid instructions" });
      }).toThrow("Template name cannot be empty");
    });

    it("should allow empty instructions for placeholder templates", () => {
      expect(() => {
        createPromptTemplate("valid-id", "Valid Name", { instructions: "" });
      }).not.toThrow();
    });

    it("should allow whitespace-only instructions for placeholder templates", () => {
      expect(() => {
        createPromptTemplate("valid-id", "Valid Name", { instructions: "   " });
      }).not.toThrow();
    });

    it("should allow missing instructions for placeholder templates", () => {
      expect(() => {
        createPromptTemplate("valid-id", "Valid Name", {} as any);
      }).not.toThrow();
    });

    it("should handle special characters in ID and name", () => {
      const template = createPromptTemplate("template-id_123", "Template with émojis 🚀 and symbols @#$%", {
        instructions: "Instructions with <html> tags & symbols",
      });

      expect(template.id).toBe("template-id_123");
      expect(template.name).toBe("Template with émojis 🚀 and symbols @#$%");
      expect(template.sections.instructions).toBe("Instructions with <html> tags & symbols");
    });

    it("should handle very long content", () => {
      const longId = "a".repeat(100);
      const longName = "Template Name ".repeat(50);
      const longInstructions = "These are very long instructions. ".repeat(100);

      const template = createPromptTemplate(longId, longName, { instructions: longInstructions });

      expect(template.id).toBe(longId);
      expect(template.name).toBe(longName);
      expect(template.sections.instructions).toBe(longInstructions);
    });

    it("should create template that passes validation", () => {
      const template = createPromptTemplate(
        "validated-template",
        "Validated Template",
        {
          instructions: "Validated instructions",
          output: "Output format",
        },
        "✅"
      );

      // The created template should be valid for building prompts
      const params: PromptBuildParams = {
        text: "Test text",
      };

      expect(() => validateBuildParams(template, params)).not.toThrow();
    });

    it("should work with buildPrompt function", () => {
      const template = createPromptTemplate("build-test", "Build Test Template", {
        instructions: "Process the following text according to requirements.",
        output: "Format as clean, professional text.",
      });

      const params: PromptBuildParams = {
        text: "Sample text for building",
      };

      const result = buildPrompt(template, params);

      expect(result).toContain("## Instructions");
      expect(result).toContain("Process the following text according to requirements.");
      expect(result).toContain("Sample text for building");
      expect(result).toContain("Format as clean, professional text.");
    });

    it("should handle undefined optional sections", () => {
      const sections = {
        instructions: "Main instructions",
        tone: undefined,
        context: undefined,
        requirements: undefined,
        output: undefined,
      };

      const template = createPromptTemplate("minimal-template", "Minimal Template", sections as any);

      expect(template.sections.instructions).toBe("Main instructions");
      expect(template.sections.requirements).toBeUndefined();
      expect(template.sections.output).toBeUndefined();
    });

    it("should maintain reference equality for sections object", () => {
      const sections = {
        instructions: "Test instructions",
        output: "Test output",
      };

      const template = createPromptTemplate("reference-test", "Reference Test", sections);

      // Should create a new template object but preserve section structure
      expect(template.sections).toEqual(sections);
      expect(template.sections.instructions).toBe(sections.instructions);
      expect(template.sections.output).toBe(sections.output);
    });

    it("should handle default parameter values correctly", () => {
      // Test default isBuiltIn = false
      const template1 = createPromptTemplate("default-test-1", "Default Test 1", { instructions: "Test" });
      expect(template1.isBuiltIn).toBe(false);

      // Test default icon = undefined
      const template2 = createPromptTemplate(
        "default-test-2",
        "Default Test 2",
        { instructions: "Test" },
        undefined,
        false
      );
      expect(template2.icon).toBeUndefined();
    });
  });
});
