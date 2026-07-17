/**
 * Unit tests for file utilities
 * Tests file context validation and path handling
 */

import {
  isAbsolutePath,
  getFileExtension,
  detectLanguage,
  validateFilePath,
  sanitizeFilePath,
  isWithinAllowedDirectory,
} from "../../../src/utils/fileUtils";

describe("fileUtils", () => {
  describe("isAbsolutePath", () => {
    it("should return true for absolute paths", () => {
      expect(isAbsolutePath("/absolute/path")).toBe(true);
      expect(isAbsolutePath("/Users/test/file.ts")).toBe(true);
      expect(isAbsolutePath("/")).toBe(true);
    });

    it("should return true for Windows absolute paths", () => {
      expect(isAbsolutePath("C:\\Users\\test\\file.ts")).toBe(true);
      expect(isAbsolutePath("D:\\path\\to\\file")).toBe(true);
    });

    it("should return false for relative paths", () => {
      expect(isAbsolutePath("./relative")).toBe(false);
      expect(isAbsolutePath("../parent")).toBe(false);
      expect(isAbsolutePath("relative/path")).toBe(false);
      expect(isAbsolutePath("file.ts")).toBe(false);
    });
  });

  describe("getFileExtension", () => {
    it("should extract file extension", () => {
      expect(getFileExtension("/path/to/file.ts")).toBe("ts");
      expect(getFileExtension("/path/to/file.test.js")).toBe("js");
      expect(getFileExtension("file.py")).toBe("py");
    });

    it("should return empty string for files without extension", () => {
      expect(getFileExtension("/path/to/README")).toBe("");
      expect(getFileExtension("/path/to/Makefile")).toBe("");
    });

    it("should handle multiple dots correctly", () => {
      expect(getFileExtension("/path/file.test.spec.ts")).toBe("ts");
      expect(getFileExtension("/path/.hidden.file.js")).toBe("js");
    });
  });

  describe("detectLanguage", () => {
    it("should detect language from common extensions", () => {
      const testCases: Record<string, string> = {
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".py": "python",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".cpp": "cpp",
        ".c": "c",
        ".md": "markdown",
        ".json": "json",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".html": "html",
        ".css": "css",
        ".sh": "bash",
      };

      for (const [ext, expected] of Object.entries(testCases)) {
        expect(detectLanguage(`/path/file${ext}`)).toBe(expected);
      }
    });

    it("should return 'text' for unknown extensions", () => {
      expect(detectLanguage("/path/file.unknown")).toBe("text");
      expect(detectLanguage("/path/file.xyz")).toBe("text");
    });

    it("should return 'text' for files without extension", () => {
      expect(detectLanguage("/path/README")).toBe("text");
      expect(detectLanguage("/path/LICENSE")).toBe("text");
    });
  });

  describe("validateFilePath", () => {
    it("should validate correct absolute paths", () => {
      expect(() => validateFilePath("/absolute/path/file.ts")).not.toThrow();
      expect(() => validateFilePath("/Users/test/project/src/index.ts")).not.toThrow();
    });

    it("should throw for relative paths", () => {
      expect(() => validateFilePath("./relative/path")).toThrow("Path must be absolute");
      expect(() => validateFilePath("../parent/file.ts")).toThrow("Path must be absolute");
    });

    it("should throw for empty paths", () => {
      expect(() => validateFilePath("")).toThrow("Path cannot be empty");
    });

    it("should throw for path traversal attempts", () => {
      expect(() => validateFilePath("/path/../../../etc/passwd")).toThrow("Invalid path");
      expect(() => validateFilePath("/path/./../../outside")).toThrow("Invalid path");
    });

    it("should throw for paths containing suspicious patterns", () => {
      expect(() => validateFilePath("/path/with\x00null")).toThrow("Invalid path");
    });
  });

  describe("sanitizeFilePath", () => {
    it("should normalize valid paths", () => {
      expect(sanitizeFilePath("/path/to/./file.ts")).toBe("/path/to/file.ts");
      expect(sanitizeFilePath("/path/to/../file.ts")).toBe("/path/file.ts");
    });

    it("should remove trailing slashes", () => {
      expect(sanitizeFilePath("/path/to/file/")).toBe("/path/to/file");
      expect(sanitizeFilePath("/path/to/dir///")).toBe("/path/to/dir");
    });

    it("should handle multiple consecutive slashes", () => {
      expect(sanitizeFilePath("/path//to///file.ts")).toBe("/path/to/file.ts");
    });

    it("should preserve absolute path", () => {
      const sanitized = sanitizeFilePath("/absolute/path");
      expect(sanitized.startsWith("/")).toBe(true);
    });
  });

  describe("isWithinAllowedDirectory", () => {
    const allowedDirs = ["/home/user/projects", "/home/user/workspace"];

    it("should allow files within allowed directories", () => {
      expect(isWithinAllowedDirectory("/home/user/projects/file.ts", allowedDirs)).toBe(true);
      expect(isWithinAllowedDirectory("/home/user/projects/src/index.ts", allowedDirs)).toBe(true);
      expect(isWithinAllowedDirectory("/home/user/workspace/app.js", allowedDirs)).toBe(true);
    });

    it("should reject files outside allowed directories", () => {
      expect(isWithinAllowedDirectory("/etc/passwd", allowedDirs)).toBe(false);
      expect(isWithinAllowedDirectory("/home/user/other/file.ts", allowedDirs)).toBe(false);
      expect(isWithinAllowedDirectory("/tmp/file.ts", allowedDirs)).toBe(false);
    });

    it("should reject path traversal attempts", () => {
      expect(isWithinAllowedDirectory("/home/user/projects/../../../etc/passwd", allowedDirs)).toBe(false);
      expect(isWithinAllowedDirectory("/home/user/workspace/../../root", allowedDirs)).toBe(false);
    });

    it("should return true when allowed directories is empty (no restrictions)", () => {
      expect(isWithinAllowedDirectory("/any/path/file.ts", [])).toBe(true);
      expect(isWithinAllowedDirectory("/etc/passwd", [])).toBe(true);
    });

    it("should handle exact directory match", () => {
      expect(isWithinAllowedDirectory("/home/user/projects", allowedDirs)).toBe(true);
      expect(isWithinAllowedDirectory("/home/user/workspace", allowedDirs)).toBe(true);
    });
  });
});
