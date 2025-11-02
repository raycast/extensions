/**
 * Tests for fuzzy matching functionality
 */

import { describe, it, expect } from "vitest";
import { fuzzyMatch, calculateMatchScore, normalizeString } from "./fuzzy-match";

describe("normalizeString", () => {
  it("should convert to lowercase", () => {
    expect(normalizeString("Hello World")).toBe("hello world");
  });

  it("should trim whitespace", () => {
    expect(normalizeString("  Hello  ")).toBe("hello");
  });

  it("should normalize multiple spaces", () => {
    expect(normalizeString("Hello   World")).toBe("hello world");
  });

  it("should handle empty string", () => {
    expect(normalizeString("")).toBe("");
  });

  it("should handle special characters", () => {
    expect(normalizeString("Hello-World_App")).toBe("hello-world_app");
  });
});

describe("calculateMatchScore", () => {
  describe("exact matches", () => {
    it("should return 100 for exact match", () => {
      const score = calculateMatchScore("chrome", "chrome");
      expect(score.score).toBe(100);
      expect(score.reason).toBe("exact");
    });

    it("should return 100 for exact match (case insensitive)", () => {
      const score = calculateMatchScore("Chrome", "chrome");
      expect(score.score).toBe(100);
      expect(score.reason).toBe("exact");
    });

    it("should return 100 for exact match with different spacing", () => {
      const score = calculateMatchScore("Google Chrome", "google chrome");
      expect(score.score).toBe(100);
      expect(score.reason).toBe("exact");
    });
  });

  describe("prefix matches", () => {
    it("should return high score for prefix match", () => {
      const score = calculateMatchScore("Google Chrome", "google");
      expect(score.score).toBeGreaterThanOrEqual(85);
      expect(score.reason).toBe("exact"); // "google" is an exact word match
    });

    it("should return high score for word prefix", () => {
      const score = calculateMatchScore("Google Chrome", "chro");
      expect(score.score).toBeGreaterThanOrEqual(75);
      expect(score.reason).toBe("prefix");
    });
  });

  describe("contains matches", () => {
    it("should return high score for complete word match", () => {
      const score = calculateMatchScore("Google Chrome Browser", "chrome");
      expect(score.score).toBeGreaterThanOrEqual(90);
      // "chrome" is a complete word in the target, so high score is expected
    });

    it("should return high score for word prefix", () => {
      const score = calculateMatchScore("Application Name", "app");
      expect(score.score).toBeGreaterThan(75);
      // "app" is a prefix of "application", so high score is expected
    });
  });

  describe("no matches", () => {
    it("should return 0 for no match", () => {
      const score = calculateMatchScore("Chrome", "firefox");
      expect(score.score).toBe(0);
    });

    it("should return 0 for empty query", () => {
      const score = calculateMatchScore("Chrome", "");
      expect(score.score).toBe(0);
    });
  });

  describe("special cases", () => {
    it("should handle hyphens and underscores", () => {
      const score = calculateMatchScore("Visual-Studio-Code", "visual studio");
      expect(score.score).toBeGreaterThan(70);
    });

    it("should handle acronyms", () => {
      const score = calculateMatchScore("Visual Studio Code", "vsc");
      expect(score.score).toBeGreaterThan(0);
    });

    it("should prioritize longer query matches", () => {
      const shortScore = calculateMatchScore("Google Chrome", "chr");
      const longScore = calculateMatchScore("Google Chrome", "chrome");
      expect(longScore.score).toBeGreaterThan(shortScore.score);
    });
  });
});

describe("fuzzyMatch", () => {
  const testApps = [
    { name: "Google Chrome", bundleId: "com.google.Chrome" },
    { name: "Safari", bundleId: "com.apple.Safari" },
    { name: "Firefox", bundleId: "org.mozilla.firefox" },
    { name: "Visual Studio Code", bundleId: "com.microsoft.VSCode" },
    { name: "Xcode", bundleId: "com.apple.dt.Xcode" },
  ];

  it("should find exact matches", () => {
    const results = fuzzyMatch(testApps, "chrome");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.app.name).toBe("Google Chrome");
    expect(results[0]!.matchScore).toBe(100);
  });

  it("should find prefix matches", () => {
    const results = fuzzyMatch(testApps, "fire");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.app.name).toBe("Firefox");
  });

  it("should find substring matches", () => {
    const results = fuzzyMatch(testApps, "code");
    expect(results.length).toBeGreaterThan(0);
    const vscode = results.find((r) => r.app.name === "Visual Studio Code");
    expect(vscode).toBeDefined();
    expect(vscode?.app.name).toBe("Visual Studio Code");
  });

  it("should sort by match score", () => {
    const results = fuzzyMatch(testApps, "code");
    expect(results[0]!.matchScore).toBeGreaterThanOrEqual(results[results.length - 1]!.matchScore);
  });

  it("should match bundleId", () => {
    const results = fuzzyMatch(testApps, "mozilla");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.app.name).toBe("Firefox");
  });

  it("should return empty array for no matches", () => {
    const results = fuzzyMatch(testApps, "nonexistent");
    expect(results).toEqual([]);
  });

  it("should handle empty query", () => {
    const results = fuzzyMatch(testApps, "");
    expect(results).toEqual([]);
  });

  it("should filter out low score matches", () => {
    const results = fuzzyMatch(testApps, "z");
    // Should not return matches with very low scores
    results.forEach((result) => {
      expect(result.matchScore).toBeGreaterThan(30);
    });
  });
});
