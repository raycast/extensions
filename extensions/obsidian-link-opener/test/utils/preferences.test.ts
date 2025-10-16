import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getObsidianPreferences,
  isValidVaultPath,
  isValidRefreshInterval,
  DEFAULT_PREFERENCES,
} from "../../src/utils/preferences";
import * as raycast from "@raycast/api";
import mockFs from "mock-fs";

// Mock the Raycast API
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
}));

// Mock localStorage if needed
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

describe("Preferences utilities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
    vi.clearAllMocks();
  });

  describe("getObsidianPreferences", () => {
    it("should return user preferences when available", () => {
      vi.mocked(raycast.getPreferenceValues).mockReturnValue({
        vaultPath: "/test/path",
        refreshInterval: 12,
      });

      const prefs = getObsidianPreferences();
      expect(prefs.vaultPath).toBe("/test/path");
      expect(prefs.refreshInterval).toBe(12);
    });

    it("should return default preferences when there's an error", () => {
      // Spy on console.error to capture and silence the output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock getPreferenceValues to throw an error
      vi.mocked(raycast.getPreferenceValues).mockImplementation(() => {
        throw new Error("Test error");
      });

      const prefs = getObsidianPreferences();
      expect(prefs).toEqual(DEFAULT_PREFERENCES);

      // Verify the error was logged
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain(
        "Error loading preferences"
      );

      // Restore the original console.error
      consoleSpy.mockRestore();
    });

    it("should use defaults for missing values", () => {
      vi.mocked(raycast.getPreferenceValues).mockReturnValue({
        vaultPath: null,
        refreshInterval: 0,
      });

      const prefs = getObsidianPreferences();
      expect(prefs.vaultPath).toBe(null);
      expect(prefs.refreshInterval).toBe(24);
    });
  });

  describe("isValidVaultPath", () => {
    it("should return false for null paths", () => {
      expect(isValidVaultPath(null)).toBe(false);
    });

    it("should return false for empty paths", () => {
      expect(isValidVaultPath("")).toBe(false);
    });

    it("should return false for non-existent paths", () => {
      // Set up a mock file system
      mockFs({
        "/existing/path": {},
      });

      expect(isValidVaultPath("/nonexistent/path")).toBe(false);
    });

    it("should return false for paths without markdown files", () => {
      // Set up a mock file system
      mockFs({
        "/invalid/path": {
          "file.txt": "Text file",
          "image.png": Buffer.from([]),
        },
      });

      expect(isValidVaultPath("/invalid/path")).toBe(false);
    });

    it("should return true for valid vault paths", () => {
      // Set up a mock file system
      mockFs({
        "/valid/path": {
          "note.md": "# Test note",
          "image.png": Buffer.from([]),
        },
      });

      expect(isValidVaultPath("/valid/path")).toBe(true);
    });

    it("should handle errors gracefully", () => {
      // Spy on console.error to capture and silence the output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Set up a path that will cause an error
      mockFs({
        "/error/path": mockFs.directory({
          mode: 0,
        }),
      });

      const result = isValidVaultPath("/error/path");
      expect(result).toBe(false);

      // Verify the error was logged - check that it was called
      expect(consoleSpy).toHaveBeenCalled();
      // Check that the first argument contains our expected string
      expect(consoleSpy.mock.calls[0][0]).toContain(
        "Error validating vault path"
      );

      // Restore the original console.error
      consoleSpy.mockRestore();
    });
  });

  describe("isValidRefreshInterval", () => {
    it("should return false for values less than 1", () => {
      expect(isValidRefreshInterval(0)).toBe(false);
      expect(isValidRefreshInterval(-5)).toBe(false);
    });

    it("should return false for values greater than 168", () => {
      expect(isValidRefreshInterval(169)).toBe(false);
      expect(isValidRefreshInterval(200)).toBe(false);
    });

    it("should return true for values between 1 and 168", () => {
      expect(isValidRefreshInterval(1)).toBe(true);
      expect(isValidRefreshInterval(24)).toBe(true);
      expect(isValidRefreshInterval(168)).toBe(true);
    });
  });
});
