import { describe, it, expect } from "vitest";
import { unescapeHTML, parseTorrentTitle } from "./formatters";

describe("unescapeHTML", () => {
  it("should unescape common HTML entities", () => {
    expect(unescapeHTML("Fish &amp; Chips")).toBe("Fish & Chips");
    expect(unescapeHTML("&lt;tag&gt;")).toBe("<tag>");
    expect(unescapeHTML("He said &quot;Hello&quot;")).toBe('He said "Hello"');
    expect(unescapeHTML("It&#39;s mine")).toBe("It's mine");
  });

  it("should return empty string for null or undefined input", () => {
    expect(unescapeHTML("")).toBe("");
  });
});

describe("parseTorrentTitle", () => {
  it("should separate title from specs correctly", () => {
    const raw = "Breaking Bad S01 [1080p] [x264] [Blu-ray]";
    const { cleanTitle, specs } = parseTorrentTitle(raw);
    expect(cleanTitle).toBe("Breaking Bad S01");
    expect(specs).toBe("1080p • x264 • Blu-ray");
  });

  it("should handle titles with years", () => {
    const raw = "The Matrix 1999 [4K] [HEVC]";
    const { cleanTitle, specs } = parseTorrentTitle(raw);
    expect(cleanTitle).toBe("The Matrix 1999");
    expect(specs).toBe("4K • HEVC");
  });

  it("should remove INTERNAL and trailing dashes", () => {
    const raw = "Some Movie - INTERNAL [1080p]";
    const { cleanTitle, specs } = parseTorrentTitle(raw);
    expect(cleanTitle).toBe("Some Movie");
    expect(specs).toBe("1080p");
  });

  it("should remove Free tag from specs", () => {
    const raw = "Free Movie [1080p] [Free]";
    const { cleanTitle, specs } = parseTorrentTitle(raw);
    expect(cleanTitle).toBe("Free Movie");
    expect(specs).toBe("1080p");
  });

  it("should handle titles without specs", () => {
    const raw = "Simple Title";
    const { cleanTitle, specs } = parseTorrentTitle(raw);
    expect(cleanTitle).toBe("Simple Title");
    expect(specs).toBe("");
  });

  it("should handle BJ-Share specific formats like Jogo or Pack", () => {
    const raw = "Super Game [Jogo] [v2024]";
    const { cleanTitle, specs } = parseTorrentTitle(raw);
    expect(cleanTitle).toBe("Super Game");
    expect(specs).toBe("Jogo • v2024");
  });
});
