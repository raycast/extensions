import { describe, expect, it, vi } from "vitest";

// Mock the @raycast/api module since cli.ts imports from it
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({})),
}));

import { parseApps, parseLines, parseRunningApps, parseWorkspaces } from "../cli";

describe("parseLines", () => {
  it("should parse newline-separated text into an array", () => {
    const input = "line1\nline2\nline3\n";
    expect(parseLines(input)).toEqual(["line1", "line2", "line3"]);
  });

  it("should filter out empty lines", () => {
    const input = "line1\n\nline2\n\n\nline3\n";
    expect(parseLines(input)).toEqual(["line1", "line2", "line3"]);
  });

  it("should return an empty array for empty input", () => {
    expect(parseLines("")).toEqual([]);
    expect(parseLines("\n")).toEqual([]);
    expect(parseLines("  ")).toEqual([]);
  });

  it("should handle single line input", () => {
    expect(parseLines("single")).toEqual(["single"]);
  });

  it("should handle input with trailing whitespace on lines", () => {
    const input = "line1\nline2\nline3";
    expect(parseLines(input)).toEqual(["line1", "line2", "line3"]);
  });
});

describe("parseWorkspaces", () => {
  it("should parse workspace names without display info", () => {
    const input = "Terminal\nBrowser\nCode\n";
    expect(parseWorkspaces(input)).toEqual([{ name: "Terminal" }, { name: "Browser" }, { name: "Code" }]);
  });

  it("should parse workspace names with display info (comma-separated)", () => {
    const input = "Terminal,Built-in Retina Display\nBrowser,LG HDR WQHD\n";
    expect(parseWorkspaces(input)).toEqual([
      { name: "Terminal", display: "Built-in Retina Display" },
      { name: "Browser", display: "LG HDR WQHD" },
    ]);
  });

  it("should handle 'None' display as undefined", () => {
    const input = "Terminal,None\n";
    expect(parseWorkspaces(input)).toEqual([{ name: "Terminal", display: undefined }]);
  });

  it("should handle empty display after comma as undefined", () => {
    const input = "Terminal,\n";
    expect(parseWorkspaces(input)).toEqual([{ name: "Terminal", display: undefined }]);
  });

  it("should handle multiple displays (comma-separated list after name)", () => {
    const input = "Terminal,Built-in Retina Display,LG HDR WQHD\n";
    expect(parseWorkspaces(input)).toEqual([{ name: "Terminal", display: "Built-in Retina Display,LG HDR WQHD" }]);
  });

  it("should return empty array for empty input", () => {
    expect(parseWorkspaces("")).toEqual([]);
  });

  it("should handle workspace names with spaces", () => {
    const input = "My Workspace,Display 1\n";
    expect(parseWorkspaces(input)).toEqual([{ name: "My Workspace", display: "Display 1" }]);
  });
});

describe("parseApps", () => {
  it("should parse app names without bundle ID", () => {
    const input = "iTerm2\nSafari\nVS Code\n";
    expect(parseApps(input)).toEqual([{ name: "iTerm2" }, { name: "Safari" }, { name: "VS Code" }]);
  });

  it("should parse app names with bundle IDs (comma-separated)", () => {
    const input = "iTerm2,com.googlecode.iterm2\nSafari,com.apple.Safari\n";
    expect(parseApps(input)).toEqual([
      { name: "iTerm2", bundleId: "com.googlecode.iterm2" },
      { name: "Safari", bundleId: "com.apple.Safari" },
    ]);
  });

  it("should handle empty bundle ID after comma", () => {
    const input = "iTerm2,\n";
    expect(parseApps(input)).toEqual([{ name: "iTerm2", bundleId: undefined }]);
  });

  it("should return empty array for empty input", () => {
    expect(parseApps("")).toEqual([]);
  });

  it("should correctly split on first comma only", () => {
    // Bundle IDs with dots shouldn't cause issues
    const input = "Visual Studio Code,com.microsoft.VSCode\n";
    expect(parseApps(input)).toEqual([{ name: "Visual Studio Code", bundleId: "com.microsoft.VSCode" }]);
  });

  it("should handle apps with commas in bundle ID (theoretically)", () => {
    // This tests that only the first comma is used as separator
    const input = "App,com.example.app,extra\n";
    expect(parseApps(input)).toEqual([{ name: "App", bundleId: "com.example.app,extra" }]);
  });
});

describe("parseRunningApps", () => {
  it("should parse running apps the same way as parseApps", () => {
    const input = "iTerm2,com.googlecode.iterm2\nSafari,com.apple.Safari\n";
    expect(parseRunningApps(input)).toEqual([
      { name: "iTerm2", bundleId: "com.googlecode.iterm2" },
      { name: "Safari", bundleId: "com.apple.Safari" },
    ]);
  });

  it("should handle running apps without bundle IDs", () => {
    const input = "SomeApp\n";
    expect(parseRunningApps(input)).toEqual([{ name: "SomeApp" }]);
  });

  it("should return empty array for empty input", () => {
    expect(parseRunningApps("")).toEqual([]);
  });
});
