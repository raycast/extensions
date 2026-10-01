import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatClock,
  formatSpeed,
  plural,
  progressMessage,
  wrapText,
  escapeMarkdown,
} from "../src/lib/format";

describe("formatBytes", () => {
  it("uses decimal units with sensible precision", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(3_400_000)).toBe("3.40 MB");
    expect(formatBytes(48_200_000)).toBe("48.2 MB");
    expect(formatBytes(512_000_000)).toBe("512 MB");
    expect(formatBytes(1_250_000_000)).toBe("1.25 GB");
  });

  it("shows a dash for unknown values", () => {
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatSpeed(undefined)).toBe("—");
  });
});

describe("formatClock", () => {
  it("formats minutes and hours", () => {
    expect(formatClock(7)).toBe("0:07");
    expect(formatClock(161)).toBe("2:41");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(undefined)).toBe("—");
  });

  it("keeps zero seconds and minutes (a one-minute TikTok showed as 01 in the Download form)", () => {
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(60)).toBe("1:00");
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(7380)).toBe("2:03:00");
  });
});

describe("plural", () => {
  it("adds an s except for one", () => {
    expect(plural(1, "file")).toBe("1 file");
    expect(plural(3, "track")).toBe("3 tracks");
  });
});

describe("wrapText", () => {
  it("wraps on word boundaries", () => {
    expect(wrapText("one two three four", 9, 3)).toEqual(["one two", "three", "four"]);
  });

  it("ellipsizes what doesn't fit", () => {
    const lines = wrapText("alpha beta gamma delta epsilon", 11, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });
});

describe("progressMessage", () => {
  it("joins whatever yt-dlp reported", () => {
    expect(progressMessage({ percent: 42.9, speed: 5_200_000, eta: 12 })).toBe("42% · 5.20 MB/s · 0:12 left");
    expect(progressMessage({ percent: 10 })).toBe("10%");
    expect(progressMessage({})).toBe("");
  });
});

describe("escapeMarkdown", () => {
  it("turns link and image syntax in a title into plain text", () => {
    expect(escapeMarkdown("[Click](https://evil.example)")).toBe("\\[Click\\]\\(https://evil\\.example\\)");
    expect(escapeMarkdown("![x](y)")).toBe("\\!\\[x\\]\\(y\\)");
  });

  it("escapes emphasis, code and HTML markers, and backslashes themselves", () => {
    expect(escapeMarkdown("*a* _b_ `c` <d> \\")).toBe("\\*a\\* \\_b\\_ \\`c\\` \\<d\\> \\\\");
  });

  it("leaves ordinary words alone", () => {
    expect(escapeMarkdown("I Got Coached By Faker")).toBe("I Got Coached By Faker");
  });
});
