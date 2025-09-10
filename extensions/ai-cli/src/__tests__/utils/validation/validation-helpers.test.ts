import { describe, expect, it } from "vitest";
import {
  createConditionalResult,
  createInvalidResult,
  createValidResult,
  formatStringTemplate,
  validateConditionalRequired,
  validateMaxLength,
  validatePromptTemplate,
  validateRequired,
  type ValidationResult,
} from "@/utils/validation";
import { PromptTemplate } from "@/types";

describe("validation-helpers", () => {
  describe("result creators", () => {
    it("should create valid results", () => {
      const result = createValidResult();
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warning).toBeUndefined();
      expect(result.suggestions).toBeUndefined();
    });

    it("should create invalid results with error", () => {
      const result = createInvalidResult("Error message");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Error message");
      expect(result.suggestions).toBeUndefined();
    });

    it("should create invalid results with error and suggestions", () => {
      const suggestions = ["Try again", "Check format"];
      const result = createInvalidResult("Invalid format", suggestions);
      expect(result).toEqual({
        valid: false,
        error: "Invalid format",
        suggestions,
      });
    });

    it("should handle empty suggestions arrays", () => {
      const result = createInvalidResult("Error", []);
      expect(result.suggestions).toEqual([]);
    });

    it("should create conditional results", () => {
      expect(createConditionalResult(true, "Error").valid).toBe(true);
      expect(createConditionalResult(false, "Error").valid).toBe(false);

      const suggestions = ["Try again", "Check input"];
      const resultWithSuggestions = createConditionalResult(false, "Failed", suggestions);
      expect(resultWithSuggestions.valid).toBe(false);
      expect(resultWithSuggestions.error).toBe("Failed");
      expect(resultWithSuggestions.suggestions).toEqual(suggestions);
    });
  });

  describe("validateRequired", () => {
    it("should accept non-empty values", () => {
      expect(validateRequired("test", "Field").valid).toBe(true);
      expect(validateRequired("  content with spaces  ", "Field").valid).toBe(true);
    });

    it("should reject empty values", () => {
      const emptyResult = validateRequired("", "Email");
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.error).toBe("Email is required");

      const whitespaceResult = validateRequired("   ", "Name");
      expect(whitespaceResult.valid).toBe(false);
      expect(whitespaceResult.error).toBe("Name is required");

      const undefinedResult = validateRequired(undefined, "Field");
      expect(undefinedResult.valid).toBe(false);
      expect(undefinedResult.error).toBe("Field is required");
    });

    it("should handle edge cases", () => {
      // Valid edge cases
      expect(validateRequired("0", "Field").valid).toBe(true);
      expect(validateRequired("false", "Field").valid).toBe(true);

      // Invalid edge cases with proper error messages
      expect(validateRequired("\n\t", "Field").error).toBe("Field is required");
      expect(validateRequired("  \n  \t  ", "Field").valid).toBe(false);
    });
  });

  describe("validateMaxLength", () => {
    it("should accept values within limit", () => {
      expect(validateMaxLength("short", 10, "Field").valid).toBe(true);
      expect(validateMaxLength("exactly10c", 10, "Field").valid).toBe(true);
    });

    it("should reject values exceeding limit", () => {
      const result = validateMaxLength("this is too long", 10, "Comment");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Comment is too long (max 10 characters)");
    });

    it("should handle optional values", () => {
      expect(validateMaxLength(undefined, 10, "Optional").valid).toBe(true);
      expect(validateMaxLength("", 10, "Optional").valid).toBe(true);
    });

    it("should handle zero max length", () => {
      const result = validateMaxLength("x", 0, "Empty");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Empty is too long (max 0 characters)");
    });

    it("should handle boundary values", () => {
      expect(validateMaxLength("a", 1, "Field").valid).toBe(true);
      expect(validateMaxLength("ab", 1, "Field").valid).toBe(false);
    });
  });

  describe("validateConditionalRequired", () => {
    it("should require value when condition is true", () => {
      expect(validateConditionalRequired(true, "value", "Custom prompt", "custom format").valid).toBe(true);

      const failureResult = validateConditionalRequired(true, "", "Custom prompt", "custom format");
      expect(failureResult.valid).toBe(false);
      expect(failureResult.error).toBe("Custom prompt is required for custom format");
    });

    it("should not require value when condition is false", () => {
      expect(validateConditionalRequired(false, "", "Field", "context").valid).toBe(true);
      expect(validateConditionalRequired(false, undefined, "Field", "context").valid).toBe(true);
    });

    it("should handle whitespace properly", () => {
      const result = validateConditionalRequired(true, "   ", "API key", "authentication");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("API key is required for authentication");
    });

    it("should handle various contexts", () => {
      expect(validateConditionalRequired(true, "", "Password", "login").error).toBe("Password is required for login");
      expect(validateConditionalRequired(true, "", "Token", "API access").error).toBe(
        "Token is required for API access"
      );
    });
  });

  describe("formatStringTemplate", () => {
    it("should replace placeholders", () => {
      const result = formatStringTemplate("Found {count} items", "count", "5");
      expect(result).toBe("Found 5 items");
    });

    it("should handle missing placeholders", () => {
      const result = formatStringTemplate("No placeholder", "missing", "value");
      expect(result).toBe("No placeholder");
    });

    it("should handle numeric values", () => {
      const result = formatStringTemplate("Processing {percent}% complete", "percent", 75);
      expect(result).toBe("Processing 75% complete");
    });

    it("should handle zero as replacement value", () => {
      const result = formatStringTemplate("Found {count} errors", "count", 0);
      expect(result).toBe("Found 0 errors");
    });

    it("should handle edge cases", () => {
      expect(formatStringTemplate("", "placeholder", "value")).toBe("");
      expect(formatStringTemplate("Template", "missing", "value")).toBe("Template");

      // Should only replace first occurrence
      const multiResult = formatStringTemplate("{name} said {name} likes coding", "name", "Alice");
      expect(multiResult).toBe("Alice said {name} likes coding");
    });

    it("should handle special characters", () => {
      const result = formatStringTemplate("User: {user} | Status: {status}", "user", "John@example.com");
      expect(result).toBe("User: John@example.com | Status: {status}");
    });
  });

  describe("validatePromptTemplate", () => {
    const validTemplate: PromptTemplate = {
      id: "test-template",
      name: "Test Template",
      isBuiltIn: false,
      sections: { instructions: "Test instructions" },
    };

    it("should accept valid templates", () => {
      expect(validatePromptTemplate(validTemplate)).toBe(true);
    });

    it("should accept templates with all optional sections", () => {
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
      expect(validatePromptTemplate(fullTemplate)).toBe(true);
    });

    it("should reject invalid templates with descriptive errors", () => {
      expect(() => validatePromptTemplate({ ...validTemplate, id: "" })).toThrow("Template ID cannot be empty");
      expect(() => validatePromptTemplate({ ...validTemplate, name: "" })).toThrow("Template name cannot be empty");
      expect(() =>
        validatePromptTemplate({
          ...validTemplate,
          sections: { instructions: "" },
        })
      ).toThrow("Template must have instructions section");
    });

    it("should handle whitespace validation", () => {
      expect(() => validatePromptTemplate({ ...validTemplate, id: "   " })).toThrow("Template ID cannot be empty");
      expect(() => validatePromptTemplate({ ...validTemplate, name: "\t\n" })).toThrow("Template name cannot be empty");
      expect(() =>
        validatePromptTemplate({
          ...validTemplate,
          sections: { instructions: "   \n\t  " },
        })
      ).toThrow("Template must have instructions section");
    });

    it("should handle missing fields", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...withoutId } = validTemplate;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, ...withoutName } = validTemplate;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sections, ...withoutSections } = validTemplate;

      expect(() => validatePromptTemplate(withoutId as any)).toThrow("Template ID cannot be empty");
      expect(() => validatePromptTemplate(withoutName as any)).toThrow("Template name cannot be empty");
      expect(() => validatePromptTemplate(withoutSections as any)).toThrow("Cannot read properties of undefined");
    });

    it("should handle complex valid templates", () => {
      const complexTemplate: PromptTemplate = {
        id: "complex-template-id",
        name: "Complex Template Name with émojis 🚀",
        icon: "📝",
        isBuiltIn: true,
        sections: {
          instructions: "Detailed instructions with multiple lines\nand formatting",
          requirements: "- Requirement 1\n- Requirement 2\n- Requirement 3",
          output: "Format output as:\n1. Section 1\n2. Section 2",
        },
      };
      expect(validatePromptTemplate(complexTemplate)).toBe(true);
    });

    it("should handle validation consistency", () => {
      // Multiple validations should return the same result
      expect(validatePromptTemplate(validTemplate)).toBe(true);
      expect(validatePromptTemplate(validTemplate)).toBe(true);
      expect(validatePromptTemplate(validTemplate)).toBe(true);
    });
  });

  describe("type safety and edge cases", () => {
    it("should maintain proper ValidationResult interface", () => {
      const validResult: ValidationResult = { valid: true };
      const invalidResult: ValidationResult = {
        valid: false,
        error: "Error message",
        warning: "Warning message",
        suggestions: ["Suggestion 1", "Suggestion 2"],
      };

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBe("Error message");
      expect(invalidResult.suggestions).toHaveLength(2);
    });

    it("should handle special characters in error messages", () => {
      const result = createInvalidResult("Error with 'quotes' and \"double quotes\"");
      expect(result.error).toBe("Error with 'quotes' and \"double quotes\"");
    });

    it("should handle unicode characters", () => {
      const result = validateRequired("🎉 emoji content", "Message");
      expect(result.valid).toBe(true);
    });

    it("should handle very long error messages", () => {
      const longError =
        "This is a very long error message that contains many words and should still work correctly regardless of length";
      const result = createInvalidResult(longError);
      expect(result.error).toBe(longError);
    });
  });
});
