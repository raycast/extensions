import { describe, it, expect } from "vitest";
import { isValidPrompt, sanitizePrompt, Prompt } from "../prompt";

describe("prompt types", () => {
  const validPrompt: Prompt = {
    id: "test-id",
    title: "Test Title",
    body: "Test Body",
    tags: ["tag1", "tag2"],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  describe("isValidPrompt", () => {
    it("should return true for valid prompt with tags", () => {
      expect(isValidPrompt(validPrompt)).toBe(true);
    });

    it("should return true for valid prompt without tags", () => {
      const promptWithoutTags = { ...validPrompt, tags: undefined };
      expect(isValidPrompt(promptWithoutTags)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isValidPrompt(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidPrompt(undefined)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(isValidPrompt("string")).toBe(false);
      expect(isValidPrompt(123)).toBe(false);
      expect(isValidPrompt(true)).toBe(false);
    });

    it("should return false for missing id", () => {
      const { id: _id, ...rest } = validPrompt;
      expect(isValidPrompt(rest)).toBe(false);
    });

    it("should return false for missing title", () => {
      const { title: _title, ...rest } = validPrompt;
      expect(isValidPrompt(rest)).toBe(false);
    });

    it("should return false for missing body", () => {
      const { body: _body, ...rest } = validPrompt;
      expect(isValidPrompt(rest)).toBe(false);
    });

    it("should return false for missing createdAt", () => {
      const { createdAt: _createdAt, ...rest } = validPrompt;
      expect(isValidPrompt(rest)).toBe(false);
    });

    it("should return false for missing updatedAt", () => {
      const { updatedAt: _updatedAt, ...rest } = validPrompt;
      expect(isValidPrompt(rest)).toBe(false);
    });

    it("should return false for wrong type id", () => {
      expect(isValidPrompt({ ...validPrompt, id: 123 })).toBe(false);
    });

    it("should return false for wrong type title", () => {
      expect(isValidPrompt({ ...validPrompt, title: 123 })).toBe(false);
    });

    it("should return false for wrong type body", () => {
      expect(isValidPrompt({ ...validPrompt, body: 123 })).toBe(false);
    });

    it("should return false for non-array tags", () => {
      expect(isValidPrompt({ ...validPrompt, tags: "string" })).toBe(false);
    });

    it("should return false for tags array with non-string elements", () => {
      expect(
        isValidPrompt({ ...validPrompt, tags: ["valid", 123, "another"] }),
      ).toBe(false);
    });

    it("should return true for empty tags array", () => {
      expect(isValidPrompt({ ...validPrompt, tags: [] })).toBe(true);
    });
  });

  describe("sanitizePrompt", () => {
    it("should return valid prompt as-is", () => {
      const result = sanitizePrompt(validPrompt);
      expect(result).toEqual(validPrompt);
    });

    it("should return null for null", () => {
      expect(sanitizePrompt(null)).toBe(null);
    });

    it("should return null for undefined", () => {
      expect(sanitizePrompt(undefined)).toBe(null);
    });

    it("should return null for non-object", () => {
      expect(sanitizePrompt("string")).toBe(null);
      expect(sanitizePrompt(123)).toBe(null);
    });

    it("should return null for missing required fields", () => {
      const { id: _id, ...rest } = validPrompt;
      expect(sanitizePrompt(rest)).toBe(null);

      const { title: _title, ...rest2 } = validPrompt;
      expect(sanitizePrompt(rest2)).toBe(null);

      const { body: _body, ...rest3 } = validPrompt;
      expect(sanitizePrompt(rest3)).toBe(null);
    });

    it("should add current timestamp for missing createdAt", () => {
      const { createdAt: _createdAt, ...rest } = validPrompt;
      const result = sanitizePrompt(rest);

      expect(result).not.toBe(null);
      expect(result?.createdAt).toBeDefined();
      expect(typeof result?.createdAt).toBe("string");
      // Check if it's a valid ISO string
      expect(new Date(result!.createdAt).toISOString()).toBe(result?.createdAt);
    });

    it("should add current timestamp for missing updatedAt", () => {
      const { updatedAt: _updatedAt, ...rest } = validPrompt;
      const result = sanitizePrompt(rest);

      expect(result).not.toBe(null);
      expect(result?.updatedAt).toBeDefined();
      expect(typeof result?.updatedAt).toBe("string");
      expect(new Date(result!.updatedAt).toISOString()).toBe(result?.updatedAt);
    });

    it("should filter out non-string tags", () => {
      const promptWithBadTags = {
        ...validPrompt,
        tags: ["valid", 123, "another", null, undefined, "last"],
      };
      const result = sanitizePrompt(promptWithBadTags);

      expect(result?.tags).toEqual(["valid", "another", "last"]);
    });

    it("should set tags to undefined for empty array after filtering", () => {
      const promptWithOnlyBadTags = {
        ...validPrompt,
        tags: [123, null, undefined],
      };
      const result = sanitizePrompt(promptWithOnlyBadTags);

      expect(result?.tags).toBeUndefined();
    });

    it("should set tags to undefined for non-array", () => {
      const promptWithBadTags = {
        ...validPrompt,
        tags: "not-an-array",
      };
      const result = sanitizePrompt(promptWithBadTags);

      expect(result?.tags).toBeUndefined();
    });

    it("should preserve valid tags", () => {
      const result = sanitizePrompt(validPrompt);
      expect(result?.tags).toEqual(validPrompt.tags);
    });

    it("should handle prompt without tags", () => {
      const { tags: _tags, ...promptWithoutTags } = validPrompt;
      const result = sanitizePrompt(promptWithoutTags);

      expect(result?.tags).toBeUndefined();
    });

    it("should handle all fields being corrupted except required ones", () => {
      const corruptedPrompt = {
        id: "valid-id",
        title: "Valid Title",
        body: "Valid Body",
        createdAt: 123, // Invalid type
        updatedAt: null, // Invalid
        tags: "not-array", // Invalid
        extraField: "should be ignored",
      };

      const result = sanitizePrompt(corruptedPrompt);

      expect(result).not.toBe(null);
      expect(result?.id).toBe("valid-id");
      expect(result?.title).toBe("Valid Title");
      expect(result?.body).toBe("Valid Body");
      expect(result?.tags).toBeUndefined();
      expect(typeof result?.createdAt).toBe("string");
      expect(typeof result?.updatedAt).toBe("string");
      // @ts-expect-error - checking that extra field doesn't exist
      expect(result?.extraField).toBeUndefined();
    });
  });
});
