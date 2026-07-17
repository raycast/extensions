import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID, isValidModelId, VALID_MODEL_IDS, validateModelId } from "./models";

describe("Model Validation", () => {
  describe("validateModelId", () => {
    it("returns the model ID when it is valid", () => {
      VALID_MODEL_IDS.forEach((validId) => {
        expect(validateModelId(validId)).toBe(validId);
      });
    });

    it("returns default model when ID is undefined", () => {
      expect(validateModelId(undefined)).toBe(DEFAULT_MODEL_ID);
    });

    it("returns default model when ID is invalid", () => {
      expect(validateModelId("mistral-small-3-2-25-06")).toBe(DEFAULT_MODEL_ID);
      expect(validateModelId("invalid-model")).toBe(DEFAULT_MODEL_ID);
      expect(validateModelId("")).toBe(DEFAULT_MODEL_ID);
    });

    it("returns custom fallback when provided", () => {
      const customFallback = "codestral-25-08";
      expect(validateModelId("invalid-model", customFallback)).toBe(customFallback);
      expect(validateModelId(undefined, customFallback)).toBe(customFallback);
    });

    it("handles legacy model IDs by returning default", () => {
      const legacyIds = [
        "magistral-medium-1-2-25-09",
        "mistral-medium-3-1-25-08",
        "codestral-25-08",
        "mistral-small-3-2-25-06",
        "mistral-tiny",
        "open-mistral-7b",
      ];

      legacyIds.forEach((legacyId) => {
        expect(validateModelId(legacyId)).toBe(DEFAULT_MODEL_ID);
      });
    });
  });

  describe("isValidModelId", () => {
    it("returns true for all valid model IDs", () => {
      VALID_MODEL_IDS.forEach((validId) => {
        expect(isValidModelId(validId)).toBe(true);
      });
    });

    it("returns false for invalid model IDs", () => {
      const invalidIds = [
        "magistral-medium-1-2-25-09",
        "invalid-model",
        "",
        "mistral-small-3-2-25-06",
        "random-string",
      ];

      invalidIds.forEach((invalidId) => {
        expect(isValidModelId(invalidId)).toBe(false);
      });
    });

    it("is case-sensitive", () => {
      expect(isValidModelId("MISTRAL-LARGE-LATEST")).toBe(false);
      expect(isValidModelId("Mistral-Large-Latest")).toBe(false);
    });
  });

  describe("Model Migration Behaviour", () => {
    it("migrates old dated model IDs to new default", () => {
      const oldModelId = "mistral-small-3-2-25-06";
      const newModelId = validateModelId(oldModelId);
      expect(newModelId).toBe(DEFAULT_MODEL_ID);
      expect(isValidModelId(newModelId)).toBe(true);
    });

    it("migrates old magistral dated IDs to new default", () => {
      const oldModelId = "magistral-medium-1-2-25-09";
      const newModelId = validateModelId(oldModelId);
      expect(newModelId).toBe(DEFAULT_MODEL_ID);
      expect(isValidModelId(newModelId)).toBe(true);
    });

    it("migrates old codestral dated IDs to new default", () => {
      const oldModelId = "codestral-25-08";
      const newModelId = validateModelId(oldModelId);
      expect(newModelId).toBe(DEFAULT_MODEL_ID);
      expect(isValidModelId(newModelId)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles null-like values gracefully", () => {
      expect(validateModelId(undefined)).toBe(DEFAULT_MODEL_ID);
      expect(validateModelId("")).toBe(DEFAULT_MODEL_ID);
    });

    it("handles whitespace in model IDs", () => {
      expect(isValidModelId(" mistral-large-latest")).toBe(false);
      expect(isValidModelId("mistral-large-latest ")).toBe(false);
      expect(isValidModelId(" mistral-large-latest ")).toBe(false);
    });

    it("maintains exact string matching", () => {
      expect(isValidModelId("mistral-large-latest")).toBe(true);
      expect(isValidModelId("mistral-large-latest-")).toBe(false);
      expect(isValidModelId("mistral-large-lates")).toBe(false);
    });
  });
});
