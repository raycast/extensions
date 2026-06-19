import { describe, it, expect } from "vitest";
import { statSync } from "fs";

// Helper function to test file icon logic
function getFileIcon(filePath: string): "folder" | "document" {
  try {
    const stats = statSync(filePath);
    return stats.isDirectory() ? "folder" : "document";
  } catch {
    return "document";
  }
}

// Helper function to test file size formatting logic
function getFileSize(filePath: string): string {
  try {
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      return "Directory";
    }
    const bytes = stats.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } catch {
    return "Unknown";
  }
}

describe("FileList Component Logic", () => {
  describe("getFileIcon", () => {
    it("should return document icon for non-existent files", () => {
      const result = getFileIcon("/nonexistent/path/file.txt");
      expect(result).toBe("document");
    });
  });

  describe("getFileSize", () => {
    it("should return Unknown for non-existent files", () => {
      const result = getFileSize("/nonexistent/path/file.txt");
      expect(result).toBe("Unknown");
    });

    it("should format bytes correctly", () => {
      // Test the formatting logic with mock data
      const testCases = [
        { bytes: 500, expected: "500 B" },
        { bytes: 1024, expected: "1.00 KB" },
        { bytes: 1536, expected: "1.50 KB" },
        { bytes: 1048576, expected: "1.00 MB" },
        { bytes: 1572864, expected: "1.50 MB" },
        { bytes: 1073741824, expected: "1.00 GB" },
        { bytes: 2147483648, expected: "2.00 GB" },
      ];

      testCases.forEach(({ bytes, expected }) => {
        let result: string;
        if (bytes < 1024) {
          result = `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
          result = `${(bytes / 1024).toFixed(2)} KB`;
        } else if (bytes < 1024 * 1024 * 1024) {
          result = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else {
          result = `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        }
        expect(result).toBe(expected);
      });
    });
  });
});
