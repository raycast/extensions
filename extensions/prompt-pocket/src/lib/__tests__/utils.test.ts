import { describe, it, expect } from "vitest";
import { truncateText, uniqueArray, isEmpty } from "../utils";

describe("utils", () => {
  describe("truncateText", () => {
    it("should return text as-is when shorter than maxLength", () => {
      expect(truncateText("Hello", 10)).toBe("Hello");
    });

    it("should return text as-is when equal to maxLength", () => {
      expect(truncateText("Hello", 5)).toBe("Hello");
    });

    it("should truncate text when longer than maxLength", () => {
      expect(truncateText("Hello World", 5)).toBe("Hello...");
    });

    it("should handle empty string", () => {
      expect(truncateText("", 5)).toBe("");
    });

    it("should handle very long text", () => {
      const longText = "a".repeat(1000);
      const result = truncateText(longText, 10);
      expect(result).toBe("aaaaaaaaaa...");
      expect(result.length).toBe(13); // 10 chars + "..."
    });

    it("should handle Japanese text", () => {
      // "こんにちは" = 5 chars, fits exactly
      expect(truncateText("こんにちは", 5)).toBe("こんにちは");
      // "こんにちは世界" = 7 chars, should truncate
      expect(truncateText("こんにちは世界", 5)).toBe("こんにちは...");
      // "こんにちは世界です" = 9 chars, should truncate
      expect(truncateText("こんにちは世界です", 7)).toBe("こんにちは世界...");
    });
  });

  describe("uniqueArray", () => {
    it("should remove duplicates from array", () => {
      expect(uniqueArray([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it("should handle empty array", () => {
      expect(uniqueArray([])).toEqual([]);
    });

    it("should handle array with no duplicates", () => {
      expect(uniqueArray([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("should work with strings", () => {
      expect(uniqueArray(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
    });

    it("should preserve order of first occurrence", () => {
      expect(uniqueArray([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
    });

    it("should work with objects (by reference)", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const obj3 = { id: 1 }; // Different object, same value
      expect(uniqueArray([obj1, obj2, obj1, obj3])).toEqual([obj1, obj2, obj3]);
    });
  });

  describe("isEmpty", () => {
    it("should return true for undefined", () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it("should return true for null", () => {
      expect(isEmpty(null)).toBe(true);
    });

    it("should return true for empty string", () => {
      expect(isEmpty("")).toBe(true);
    });

    it("should return true for whitespace-only string", () => {
      expect(isEmpty("   ")).toBe(true);
      expect(isEmpty("\t\n")).toBe(true);
    });

    it("should return false for non-empty string", () => {
      expect(isEmpty("hello")).toBe(false);
    });

    it("should return false for string with content and whitespace", () => {
      expect(isEmpty("  hello  ")).toBe(false);
    });

    it("should return false for zero", () => {
      expect(isEmpty("0")).toBe(false);
    });
  });
});
