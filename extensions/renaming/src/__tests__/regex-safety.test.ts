import { describe, it, expect } from "vitest";
import { isSafeRegex, validateRegexPattern } from "../lib/regex-safety";

describe("isSafeRegex", () => {
  describe("safe patterns", () => {
    it("should accept simple patterns", () => {
      expect(isSafeRegex("hello")).toBe(true);
      expect(isSafeRegex("\\d+")).toBe(true);
      expect(isSafeRegex("[a-z]+")).toBe(true);
      expect(isSafeRegex("file_\\d{3}")).toBe(true);
    });

    it("should accept common file renaming patterns", () => {
      expect(isSafeRegex("^prefix_")).toBe(true);
      expect(isSafeRegex("_suffix$")).toBe(true);
      expect(isSafeRegex("\\s+")).toBe(true);
      expect(isSafeRegex("[^a-zA-Z0-9]")).toBe(true);
    });
  });

  describe("potentially dangerous patterns (ReDoS)", () => {
    it("should flag some exponential backtracking patterns", () => {
      // The safe-regex library detects patterns with nested quantifiers
      // Note: Not all ReDoS patterns are detected, but common ones are
      expect(isSafeRegex("(a+)+$")).toBe(false);
      expect(isSafeRegex("(a+)+")).toBe(false);
    });

    it("should flag nested quantifiers with character classes", () => {
      expect(isSafeRegex("([a-z]+)+")).toBe(false);
    });
  });

  describe("invalid patterns", () => {
    it("should return true for invalid regex (they fail elsewhere)", () => {
      // Invalid regex can't cause ReDoS because they won't compile
      expect(isSafeRegex("[")).toBe(true);
      expect(isSafeRegex("(unclosed")).toBe(true);
    });
  });
});

describe("validateRegexPattern", () => {
  describe("valid and safe patterns", () => {
    it("should return null for valid safe patterns", () => {
      expect(validateRegexPattern("hello")).toBeNull();
      expect(validateRegexPattern("\\d+")).toBeNull();
      expect(validateRegexPattern("[a-z]+")).toBeNull();
    });

    it("should return null for empty pattern", () => {
      expect(validateRegexPattern("")).toBeNull();
    });
  });

  describe("invalid patterns", () => {
    it("should return error message for invalid regex", () => {
      const result = validateRegexPattern("[");
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid");
    });

    it("should return error message for unclosed group", () => {
      const result = validateRegexPattern("(unclosed");
      expect(result).not.toBeNull();
    });
  });

  describe("unsafe patterns", () => {
    it("should return warning for ReDoS-vulnerable patterns", () => {
      const result = validateRegexPattern("(a+)+$");
      expect(result).not.toBeNull();
      expect(result).toContain("performance");
    });
  });
});
