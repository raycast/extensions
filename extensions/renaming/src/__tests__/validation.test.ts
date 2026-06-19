import { describe, it, expect } from "vitest";
import { validateFilename, validateSeparator, wouldChangeName } from "../lib/validation";

describe("validateFilename", () => {
  describe("valid filenames", () => {
    it("should accept normal filenames", () => {
      expect(validateFilename("document.txt")).toEqual({ valid: true });
      expect(validateFilename("my-file-name.pdf")).toEqual({ valid: true });
      expect(validateFilename("photo_2024.jpg")).toEqual({ valid: true });
    });

    it("should accept filenames with spaces", () => {
      expect(validateFilename("my document.txt")).toEqual({ valid: true });
      expect(validateFilename("file with spaces.pdf")).toEqual({ valid: true });
    });

    it("should accept hidden files (dotfiles)", () => {
      expect(validateFilename(".gitignore")).toEqual({ valid: true });
      expect(validateFilename(".env")).toEqual({ valid: true });
      expect(validateFilename("..hidden")).toEqual({ valid: true });
    });

    it("should accept filenames with unicode characters", () => {
      expect(validateFilename("\u6587\u6863.txt")).toEqual({ valid: true });
      expect(validateFilename("\u00e9moji-file-\ud83d\udcc4.txt")).toEqual({ valid: true });
      expect(validateFilename("r\u00e9sum\u00e9.pdf")).toEqual({ valid: true });
    });

    it("should accept filenames at exactly 255 characters", () => {
      const maxName = "a".repeat(255);
      expect(validateFilename(maxName)).toEqual({ valid: true });
    });
  });

  describe("invalid filenames", () => {
    it("should reject empty filenames", () => {
      const result = validateFilename("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Filename cannot be empty");
    });

    it("should reject whitespace-only filenames", () => {
      const result = validateFilename("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Filename cannot be empty");
    });

    it("should reject filenames with forward slash", () => {
      const result = validateFilename("path/to/file.txt");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Filename cannot contain / or null characters");
    });

    it("should reject filenames with null character", () => {
      const result = validateFilename("file\0name.txt");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Filename cannot contain / or null characters");
    });

    it("should reject reserved names", () => {
      expect(validateFilename(".").valid).toBe(false);
      expect(validateFilename("..").valid).toBe(false);
    });

    it("should reject names that are only dots (more than 2)", () => {
      expect(validateFilename("...").valid).toBe(false);
      expect(validateFilename("....").valid).toBe(false);
      expect(validateFilename(".....").valid).toBe(false);
    });

    it("should reject filenames exceeding 255 characters", () => {
      const longName = "a".repeat(256);
      const result = validateFilename(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Filename too long");
      expect(result.error).toContain("256 bytes");
      expect(result.error).toContain("max 255");
    });
  });

  describe("edge cases", () => {
    it("should accept filenames with only extension", () => {
      expect(validateFilename(".txt")).toEqual({ valid: true });
    });

    it("should accept filenames with multiple dots", () => {
      expect(validateFilename("file.backup.txt")).toEqual({ valid: true });
      expect(validateFilename("archive.tar.gz")).toEqual({ valid: true });
    });

    it("should accept filenames with special characters (except / and null)", () => {
      expect(validateFilename("file!@#$%^&*().txt")).toEqual({ valid: true });
      expect(validateFilename("name[with]brackets.txt")).toEqual({ valid: true });
    });
  });
});

describe("validateSeparator", () => {
  describe("valid separators", () => {
    it("should accept common separators", () => {
      expect(validateSeparator("_")).toEqual({ valid: true });
      expect(validateSeparator("-")).toEqual({ valid: true });
      expect(validateSeparator(" ")).toEqual({ valid: true });
      expect(validateSeparator(".")).toEqual({ valid: true });
    });

    it("should accept empty separator", () => {
      expect(validateSeparator("")).toEqual({ valid: true });
    });

    it("should accept multi-character separators", () => {
      expect(validateSeparator("__")).toEqual({ valid: true });
      expect(validateSeparator(" - ")).toEqual({ valid: true });
    });
  });

  describe("invalid separators", () => {
    it("should reject separators with forward slash", () => {
      const result = validateSeparator("/");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Separator cannot contain /");
    });

    it("should reject separators containing forward slash", () => {
      const result = validateSeparator("_/_");
      expect(result.valid).toBe(false);
    });

    it("should reject separators with null character", () => {
      const result = validateSeparator("\x00");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Separator cannot contain null character");
    });
  });
});

describe("wouldChangeName", () => {
  it("should return true when names are different", () => {
    expect(wouldChangeName("old.txt", "new.txt")).toBe(true);
    expect(wouldChangeName("FILE.txt", "file.txt")).toBe(true);
  });

  it("should return false when names are the same", () => {
    expect(wouldChangeName("file.txt", "file.txt")).toBe(false);
    expect(wouldChangeName("", "")).toBe(false);
  });
});
