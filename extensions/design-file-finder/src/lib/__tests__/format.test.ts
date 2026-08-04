import { describe, expect, it } from "vitest";
import { formatRelativeTime, formatSize, parentFolderName } from "../format";

describe("parentFolderName", () => {
  it("returns the immediate parent folder", () => {
    expect(parentFolderName("/Volumes/SSD/Projects/promo.psd")).toBe("Projects");
    expect(parentFolderName("/Projects/a.ai")).toBe("Projects");
  });
  it("handles root-level files", () => {
    expect(parentFolderName("/file.psd")).toBe("/");
  });
});

describe("formatRelativeTime", () => {
  const now = 1_000_000_000_000;
  it("formats recent times", () => {
    expect(formatRelativeTime(now, now)).toBe("just now");
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5m ago");
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("3h ago");
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe("2d ago");
  });
  it("formats weeks, months, years", () => {
    expect(formatRelativeTime(now - 14 * 86_400_000, now)).toBe("2w ago");
    expect(formatRelativeTime(now - 60 * 86_400_000, now)).toBe("2mo ago");
    expect(formatRelativeTime(now - 800 * 86_400_000, now)).toBe("2y ago");
  });
  it("handles future timestamps", () => {
    expect(formatRelativeTime(now + 10_000, now)).toBe("soon");
  });
});

describe("formatSize", () => {
  it("formats byte sizes", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
  });
  it("returns empty for null", () => {
    expect(formatSize(null)).toBe("");
  });
});
