/**
 * Tests for app search functionality
 * Note: Integration tests with getApplications() should be done in Raycast environment
 * These tests focus on the search logic
 */

import { describe, it, expect } from "vitest";
import { fuzzyMatch } from "../utils/fuzzy-match";
import { findMatchingCategories, getCommonAppsForQuery } from "../data/app-database";

describe("app search logic", () => {
  const mockApps = [
    { name: "Google Chrome", bundleId: "com.google.Chrome" },
    { name: "Safari", bundleId: "com.apple.Safari" },
    { name: "Firefox", bundleId: "org.mozilla.firefox" },
    { name: "Visual Studio Code", bundleId: "com.microsoft.VSCode" },
    { name: "Mail", bundleId: "com.apple.mail" },
    { name: "Xcode", bundleId: "com.apple.dt.Xcode" },
  ];

  describe("fuzzy matching integration", () => {
    it("should find app by exact name", () => {
      const results = fuzzyMatch(mockApps, "chrome");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.app.name).toBe("Google Chrome");
      expect(results[0]!.matchScore).toBeGreaterThanOrEqual(85);
    });

    it("should be case insensitive", () => {
      const results = fuzzyMatch(mockApps, "SAFARI");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.app.name).toBe("Safari");
    });
  });

  describe("search patterns", () => {
    it("should find apps by prefix", () => {
      const results = fuzzyMatch(mockApps, "fire");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.app.name).toBe("Firefox");
    });

    it("should find apps by substring", () => {
      const results = fuzzyMatch(mockApps, "code");
      expect(results.length).toBeGreaterThan(0);
      const vscode = results.find((r) => r.app.name === "Visual Studio Code");
      expect(vscode).toBeDefined();
    });

    it("should find apps by bundleId", () => {
      const results = fuzzyMatch(mockApps, "mozilla");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.app.name).toBe("Firefox");
    });
  });

  describe("sorting", () => {
    it("should sort results by match score", () => {
      const results = fuzzyMatch(mockApps, "code");
      expect(results.length).toBeGreaterThan(0);

      // Scores should be in descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]!.matchScore).toBeGreaterThanOrEqual(results[i + 1]!.matchScore);
      }
    });

    it("should prioritize exact matches", () => {
      const results = fuzzyMatch(mockApps, "safari");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.app.name).toBe("Safari");
      expect(results[0]!.matchScore).toBe(100);
    });
  });

  describe("edge cases", () => {
    it("should return empty array for no matches", () => {
      const results = fuzzyMatch(mockApps, "nonexistent-app");
      expect(results).toEqual([]);
    });

    it("should return empty array for empty query", () => {
      const results = fuzzyMatch(mockApps, "");
      expect(results).toEqual([]);
    });

    it("should handle whitespace in query", () => {
      const results = fuzzyMatch(mockApps, "  chrome  ");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.app.name).toBe("Google Chrome");
    });
  });

  describe("category matching", () => {
    it("should identify browser category", () => {
      const categories = findMatchingCategories("browser");
      expect(categories).toContain("browser");
    });

    it("should identify email category", () => {
      const categories = findMatchingCategories("mail");
      expect(categories).toContain("email");
    });

    it("should identify code editor category", () => {
      const categories = findMatchingCategories("editor");
      expect(categories).toContain("code");
    });

    it("should get common apps for browser query", () => {
      const apps = getCommonAppsForQuery("browser");
      expect(apps.length).toBeGreaterThan(0);
      expect(apps).toContain("Google Chrome");
      expect(apps).toContain("Safari");
    });

    it("should get common apps for Japanese query", () => {
      const apps = getCommonAppsForQuery("ブラウザ");
      expect(apps.length).toBeGreaterThan(0);
      expect(apps).toContain("Google Chrome");
    });
  });
});
