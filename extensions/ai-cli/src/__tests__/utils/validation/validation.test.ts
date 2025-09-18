import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateClipboardContent, validateDirectory } from "@/utils/validation";
import { messages } from "@/locale/en/messages";
import { INPUT_LIMITS } from "@/constants";

const originalEnv = process.env;

describe("Validation", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, HOME: "/mock/home" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateClipboardContent", () => {
    it("accepts valid text input", () => {
      const validInputs = [
        "Hello, world!",
        "Text with Unicode 🌍 and 中文",
        "Special chars: !@#$%^&*()_+-=[]{}|;:',.<>?/~`",
        "Line 1\nLine 2\tTabbed\rCarriage return",
        "   \n  Some content  \t  \n", // Mixed whitespace
        "a".repeat(INPUT_LIMITS.MAX_TEXT_LENGTH), // Exactly at limit
      ];

      validInputs.forEach((input) => {
        const result = validateClipboardContent(input);
        expect(result.success).toBe(true);
        expect(result.timestamp).toBeDefined();
        if (result.success) {
          expect(result.data).toBeDefined();
        }
      });
    });

    it("rejects empty or too long text", () => {
      const invalidCases = [
        { input: null, expectedError: messages.validation.emptyClipboard },
        { input: "", expectedError: messages.validation.emptyClipboard },
        { input: "   \n\t  ", expectedError: messages.validation.emptyClipboard },
        {
          input: "a".repeat(INPUT_LIMITS.MAX_TEXT_LENGTH + 1),
          expectedError: "Text is too long", // Partial match for formatted message
        },
      ];

      invalidCases.forEach(({ input, expectedError }) => {
        const result = validateClipboardContent(input);
        expect(result.success).toBe(false);
        expect(result.timestamp).toBeDefined();
        if (!result.success) {
          expect(result.errors[0]).toContain(expectedError);
        }
      });
    });
  });

  describe("validateDirectory", () => {
    it("validates directory path", () => {
      // Test with non-existent directory (works without mocking)
      const result = validateDirectory("/nonexistent/directory");
      expect(result).toEqual({
        valid: false,
        error: messages.validation.directoryNotExists.replace("{path}", "/nonexistent/directory"),
      });
    });
  });

  // Variant count parsing removed: single-variant enforced throughout
});
