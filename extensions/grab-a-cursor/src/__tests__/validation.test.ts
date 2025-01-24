import { describe, expect, it } from "@jest/globals";
import {
  isValidSVG,
  isValidCursorName,
  isValidCategory,
  isAcceptableCursorSize,
} from "../utils/validation";

describe("Validation Utilities", () => {
  describe("isValidSVG", () => {
    it("should validate correct SVG content", () => {
      const validSVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"></svg>';
      expect(isValidSVG(validSVG)).toBe(true);
    });

    it("should reject invalid SVG content", () => {
      const invalidSVG = "<div>Not an SVG</div>";
      expect(isValidSVG(invalidSVG)).toBe(false);
    });

    it("should handle empty input", () => {
      expect(isValidSVG("")).toBe(false);
    });
  });

  describe("isValidCursorName", () => {
    it("should accept valid cursor names", () => {
      expect(isValidCursorName("cursor-name-123")).toBe(true);
      expect(isValidCursorName("cursor_name")).toBe(true);
      expect(isValidCursorName("CursorName123")).toBe(true);
    });

    it("should reject invalid cursor names", () => {
      expect(isValidCursorName("")).toBe(false);
      expect(isValidCursorName("cursor name")).toBe(false);
      expect(isValidCursorName("cursor@name")).toBe(false);
      expect(isValidCursorName("a".repeat(51))).toBe(false);
    });
  });

  describe("isValidCategory", () => {
    it("should accept valid categories", () => {
      expect(isValidCategory("User Interface")).toBe(true);
      expect(isValidCategory("Arrows")).toBe(true);
      expect(isValidCategory("Custom-Set-1")).toBe(true);
    });

    it("should reject invalid categories", () => {
      expect(isValidCategory("")).toBe(false);
      expect(isValidCategory("Category@Name")).toBe(false);
      expect(isValidCategory("a".repeat(31))).toBe(false);
    });
  });

  describe("isAcceptableCursorSize", () => {
    it("should accept cursors within size limit", () => {
      expect(isAcceptableCursorSize("small content")).toBe(true);
      expect(isAcceptableCursorSize("a".repeat(100000))).toBe(true);
    });

    it("should reject oversized cursors", () => {
      expect(isAcceptableCursorSize("")).toBe(false);
      expect(isAcceptableCursorSize("a".repeat(100001))).toBe(false);
    });
  });
});
