import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, type Stats, statSync } from "fs";
import { createFilePath, validateDirectory } from "@/utils/validation";

// Mock fs module
vi.mock("fs");
const mockExistsSync = vi.mocked(existsSync);
const mockStatSync = vi.mocked(statSync);

// Mock message formatting to prevent dependencies
vi.mock("@/utils/message-formatting", () => ({
  formatFileSystemError: (template: string, path: string, error?: string) => {
    let result = template.replace(/{path}/g, path);
    if (error) result = result.replace(/{error}/g, error);
    return result;
  },
}));

describe("file-system-validation", () => {
  // Minimal mock stats helper
  const createMockStats = (isFile = false, isDirectory = false) =>
    ({
      isFile: () => isFile,
      isDirectory: () => isDirectory,
      mode: 0o644,
    }) as Stats;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HOME = "/Users/testuser";
  });

  describe("createFilePath", () => {
    it("should handle paths correctly", () => {
      expect(createFilePath("/test/path")).toBe("/test/path");
      expect(createFilePath("")).toBe("");
    });
  });

  describe("validateDirectory", () => {
    it("should return invalid when directory does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = validateDirectory("/nonexistent");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not exist");
    });

    it("should return invalid when path is not a directory", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(createMockStats(true, false));

      const result = validateDirectory("/usr/bin/claude");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("not a directory");
    });

    it("should return valid for existing directory", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(createMockStats(false, true));

      const result = validateDirectory("/usr/bin");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should handle file system errors", () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error("Access denied");
      });

      const result = validateDirectory("/restricted");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Cannot access");
    });
  });
});
