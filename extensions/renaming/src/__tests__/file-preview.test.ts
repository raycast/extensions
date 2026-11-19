import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  isPreviewableImage,
  readTextPreview,
  toCodeFenceMarkdown,
  toFileUri,
  getFileStats,
  formatFileSize,
} from "../lib/file-preview";

describe("isPreviewableImage", () => {
  it("accepts common image extensions regardless of case", () => {
    expect(isPreviewableImage("/a/photo.png")).toBe(true);
    expect(isPreviewableImage("/a/photo.JPG")).toBe(true);
    expect(isPreviewableImage("/a/photo.jpeg")).toBe(true);
    expect(isPreviewableImage("/a/photo.HEIC")).toBe(true);
    expect(isPreviewableImage("/a/photo.webp")).toBe(true);
  });

  it("rejects non-image files", () => {
    expect(isPreviewableImage("/a/doc.pdf")).toBe(false);
    expect(isPreviewableImage("/a/song.mp3")).toBe(false);
    expect(isPreviewableImage("/a/noext")).toBe(false);
    expect(isPreviewableImage("/a/archive.png.zip")).toBe(false);
  });
});

describe("readTextPreview", () => {
  const dir = mkdtempSync(join(tmpdir(), "text-preview-test-"));

  it("returns the file content for a short text file", () => {
    const file = join(dir, "short.txt");
    writeFileSync(file, "line one\nline two\n");
    expect(readTextPreview(file)).toBe("line one\nline two");
  });

  it("truncates long files to 25 lines with an ellipsis", () => {
    const file = join(dir, "long.txt");
    writeFileSync(file, Array.from({ length: 40 }, (_, i) => `line ${i + 1}`).join("\n"));
    const preview = readTextPreview(file);
    expect(preview!.endsWith("…")).toBe(true);
    expect(preview!.split("\n")).toHaveLength(26);
    expect(preview!.split("\n")[24]).toBe("line 25");
  });

  it("returns undefined for empty, binary, and missing files", () => {
    const empty = join(dir, "empty.txt");
    writeFileSync(empty, "");
    expect(readTextPreview(empty)).toBeUndefined();

    const binary = join(dir, "binary.txt");
    writeFileSync(binary, Buffer.from([0x68, 0x69, 0x00, 0x21]));
    expect(readTextPreview(binary)).toBeUndefined();

    expect(readTextPreview(join(dir, "missing.txt"))).toBeUndefined();
  });

  it("sniffs text-ness from content, not the extension", () => {
    // Extensionless or unknown-extension text files still preview
    const makefile = join(dir, "Makefile");
    writeFileSync(makefile, "all:\n\techo hi\n");
    expect(readTextPreview(makefile)).toBe("all:\n\techo hi");

    // Binary without NUL bytes (invalid UTF-8 soup) is still rejected
    const noNulBinary = join(dir, "garbage.txt");
    writeFileSync(noNulBinary, Buffer.from(Array.from({ length: 256 }, (_, i) => 0x80 + (i % 0x40))));
    expect(readTextPreview(noNulBinary)).toBeUndefined();
  });
});

describe("toFileUri", () => {
  it("prefixes with file:// and keeps plain paths intact", () => {
    expect(toFileUri("/Users/me/photo.png")).toBe("file:///Users/me/photo.png");
  });

  it("percent-encodes spaces and special characters per segment", () => {
    expect(toFileUri("/Users/me/holiday photo (1).png")).toBe("file:///Users/me/holiday%20photo%20%281%29.png");
    expect(toFileUri("/Users/me/a#b?c.png")).toBe("file:///Users/me/a%23b%3Fc.png");
  });

  it("does not encode the path separators themselves", () => {
    expect(toFileUri("/a/b/c.png").split("/").length).toBe("file:///a/b/c.png".split("/").length);
  });
});

describe("getFileStats", () => {
  it("returns size and mtime for an existing file", () => {
    const dir = mkdtempSync(join(tmpdir(), "file-preview-test-"));
    const file = join(dir, "sample.txt");
    writeFileSync(file, "hello");

    const stats = getFileStats(file);
    expect(stats).toBeDefined();
    expect(stats!.size).toBe(5);
    expect(stats!.modifiedMs).toBeGreaterThan(0);
  });

  it("returns undefined for a missing file", () => {
    expect(getFileStats("/nonexistent/definitely-not-here.txt")).toBeUndefined();
  });
});

describe("formatFileSize", () => {
  it("formats bytes below 1 KB as-is", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("formats kilobytes and megabytes with one decimal", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("drops the decimal at 100 or more of a unit", () => {
    expect(formatFileSize(150 * 1024)).toBe("150 KB");
  });

  it("caps at terabytes", () => {
    expect(formatFileSize(1024 ** 5)).toBe("1024 TB");
  });
});

describe("toCodeFenceMarkdown", () => {
  it("wraps ordinary snippets in a four-backtick fence", () => {
    expect(toCodeFenceMarkdown("hello\nworld")).toBe("````\nhello\nworld\n````");
  });

  it("grows the fence beyond the longest backtick run in the content", () => {
    const snippet = "````\nfour backticks above could close a fixed fence";
    const result = toCodeFenceMarkdown(snippet);
    expect(result.startsWith("`````\n")).toBe(true);
    expect(result.endsWith("\n`````")).toBe(true);
  });
});
