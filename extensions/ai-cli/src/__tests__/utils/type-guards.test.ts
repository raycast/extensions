import { describe, expect, it } from "vitest";
import {
  createValidatedInput,
  getSafeValue,
  isManageCommand,
  isValidatedInput,
  isValidPromptTemplate,
} from "@/utils/type-guards";
import type { ValidatedInput } from "@/types";
import type { PromptTemplate } from "@/types/prompt-template";

describe("type-guards", () => {
  describe("createValidatedInput", () => {
    it("should preserve input value unchanged", () => {
      const input = "test input";
      const result = createValidatedInput(input);
      expect(result).toBe(input);
    });

    it("should maintain type preservation", () => {
      const stringResult: ValidatedInput<string> = createValidatedInput("test");
      const numberResult: ValidatedInput<number> = createValidatedInput(42);

      expect(typeof stringResult).toBe("string");
      expect(typeof numberResult).toBe("number");
    });

    it("should handle edge cases", () => {
      expect(createValidatedInput(null)).toBe(null);
      expect(createValidatedInput(undefined)).toBe(undefined);
      expect(createValidatedInput("")).toBe("");
    });
  });

  describe("isValidatedInput", () => {
    it("should accept non-empty strings", () => {
      expect(isValidatedInput("valid input")).toBe(true);
      expect(isValidatedInput("a")).toBe(true);
      expect(isValidatedInput("  content with spaces  ")).toBe(true);
    });

    it("should reject empty or whitespace-only strings", () => {
      expect(isValidatedInput("")).toBe(false);
      expect(isValidatedInput("   ")).toBe(false);
      expect(isValidatedInput("\n\t")).toBe(false);
      expect(isValidatedInput("  \n  \t  ")).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(isValidatedInput(null)).toBe(false);
      expect(isValidatedInput(undefined)).toBe(false);
      expect(isValidatedInput(123)).toBe(false);
      expect(isValidatedInput({})).toBe(false);
      expect(isValidatedInput([])).toBe(false);
      expect(isValidatedInput(true)).toBe(false);
    });

    it("should handle special characters and unicode", () => {
      expect(isValidatedInput("text with émojis 🚀")).toBe(true);
      expect(isValidatedInput("special chars: @#$%^&*()")).toBe(true);
      expect(isValidatedInput("newlines\nand\ttabs")).toBe(true);
    });
  });

  describe("isManageCommand", () => {
    it("should identify MANAGE_ prefixed commands", () => {
      expect(isManageCommand("MANAGE_FORMATS")).toBe(true);
      expect(isManageCommand("MANAGE_TONES")).toBe(true);
      expect(isManageCommand("MANAGE_CUSTOM")).toBe(true);
      expect(isManageCommand("MANAGE_")).toBe(true);
    });

    it("should reject non-manage commands", () => {
      expect(isManageCommand("slack")).toBe(false);
      expect(isManageCommand("github-pr")).toBe(false);
      expect(isManageCommand("")).toBe(false);
      expect(isManageCommand("MANAGE")).toBe(false); // missing underscore
    });

    it("should be case sensitive", () => {
      expect(isManageCommand("manage_formats")).toBe(false);
      expect(isManageCommand("Manage_Templates")).toBe(false);
      expect(isManageCommand("MANAGE_formats")).toBe(true);
    });

    it("should handle null/undefined safely", () => {
      expect(isManageCommand(null as any)).toBe(false);
      expect(isManageCommand(undefined)).toBe(false);
    });
  });

  describe("getSafeValue", () => {
    it("should return fallback for manage commands", () => {
      const fallback = "default-value";
      expect(getSafeValue("MANAGE_FORMATS", fallback)).toBe(fallback);
      expect(getSafeValue("MANAGE_TONES", fallback)).toBe(fallback);
      expect(getSafeValue("MANAGE_CUSTOM", fallback)).toBe(fallback);
    });

    it("should return original value for normal commands", () => {
      expect(getSafeValue("slack", "fallback")).toBe("slack");
      expect(getSafeValue("github-pr", "fallback")).toBe("github-pr");
      expect(getSafeValue("email", "fallback")).toBe("email");
    });

    it("should handle edge cases", () => {
      expect(getSafeValue("", "fallback")).toBe("fallback");
      expect(getSafeValue(undefined, "fallback")).toBe("fallback");
      expect(getSafeValue("MANAGE_", "fallback")).toBe("fallback");
    });
  });

  describe("isValidPromptTemplate", () => {
    const validTemplate: PromptTemplate = {
      id: "test-template",
      name: "Test Template",
      isBuiltIn: false,
      sections: { instructions: "Test instructions" },
    };

    it("should accept valid templates", () => {
      expect(isValidPromptTemplate(validTemplate)).toBe(true);
    });

    it("should accept templates with all optional fields", () => {
      const fullTemplate: PromptTemplate = {
        id: "complete-template",
        name: "Complete Template",
        icon: "🚀",
        isBuiltIn: true,
        sections: {
          instructions: "Complete instructions",
          requirements: "Requirements here",
          output: "Output format instructions",
        },
      };
      expect(isValidPromptTemplate(fullTemplate)).toBe(true);
    });

    it("should reject invalid templates", () => {
      expect(isValidPromptTemplate(null)).toBe(false);
      expect(isValidPromptTemplate(undefined)).toBe(false);
      expect(isValidPromptTemplate("string")).toBe(false);
      expect(isValidPromptTemplate(123)).toBe(false);
    });

    it("should reject templates with invalid required fields", () => {
      expect(isValidPromptTemplate({ ...validTemplate, id: "" })).toBe(false);
      expect(isValidPromptTemplate({ ...validTemplate, name: "" })).toBe(false);
      expect(isValidPromptTemplate({ ...validTemplate, sections: { instructions: "" } })).toBe(false);

      // Test missing fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...withoutId } = validTemplate;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, ...withoutName } = validTemplate;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sections, ...withoutSections } = validTemplate;

      expect(isValidPromptTemplate(withoutId as any)).toBe(false);
      expect(isValidPromptTemplate(withoutName as any)).toBe(false);
      expect(isValidPromptTemplate(withoutSections as any)).toBe(false);
    });

    it("should validate field types strictly", () => {
      expect(isValidPromptTemplate({ ...validTemplate, id: 123 as any })).toBe(false);
      expect(isValidPromptTemplate({ ...validTemplate, name: 123 as any })).toBe(false);
      expect(isValidPromptTemplate({ ...validTemplate, isBuiltIn: "false" as any })).toBe(false);
      expect(isValidPromptTemplate({ ...validTemplate, icon: 123 as any })).toBe(false);
    });

    it("should handle whitespace validation", () => {
      expect(isValidPromptTemplate({ ...validTemplate, id: "   " })).toBe(false);
      expect(isValidPromptTemplate({ ...validTemplate, name: "\t\n" })).toBe(false);
      expect(
        isValidPromptTemplate({
          ...validTemplate,
          sections: { instructions: "   \n\t  " },
        })
      ).toBe(false);
    });
  });

  describe("integration workflows", () => {
    it("should support complete validation workflow", () => {
      const userInput = "user provided text";
      const validated = createValidatedInput(userInput);

      if (isValidatedInput(validated)) {
        expect(validated).toBe(userInput);
      } else {
        expect.fail("Validation should have passed");
      }
    });

    it("should handle command safety workflow", () => {
      const commands = ["MANAGE_FORMATS", "MANAGE_TONES", "slack", "github-pr"];
      const fallback = "default";

      commands.forEach((command) => {
        const result = getSafeValue(command, fallback);
        expect(typeof result).toBe("string");

        if (isManageCommand(command)) {
          expect(result).toBe(fallback);
        } else {
          expect(result).toBe(command);
        }
      });
    });
  });
});
