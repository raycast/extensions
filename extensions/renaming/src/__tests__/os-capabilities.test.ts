import { describe, it, expect } from "vitest";

import { isPreviewableImage } from "../lib/os-capabilities";

describe("isPreviewableImage", () => {
  it("returns true for .jpg, .png, .gif, .svg", () => {
    expect(isPreviewableImage(".jpg")).toBe(true);
    expect(isPreviewableImage(".png")).toBe(true);
    expect(isPreviewableImage(".gif")).toBe(true);
    expect(isPreviewableImage(".svg")).toBe(true);
  });

  it("returns true for .heic, .webp, .bmp, .ico", () => {
    expect(isPreviewableImage(".heic")).toBe(true);
    expect(isPreviewableImage(".webp")).toBe(true);
    expect(isPreviewableImage(".bmp")).toBe(true);
    expect(isPreviewableImage(".ico")).toBe(true);
  });

  it("returns false for non-image formats", () => {
    expect(isPreviewableImage(".pdf")).toBe(false);
    expect(isPreviewableImage(".mp4")).toBe(false);
    expect(isPreviewableImage(".txt")).toBe(false);
    expect(isPreviewableImage(".ts")).toBe(false);
  });

  it("handles full file paths", () => {
    expect(isPreviewableImage("/path/to/image.jpg")).toBe(true);
    expect(isPreviewableImage("/path/to/file.txt")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isPreviewableImage(".JPG")).toBe(true);
    expect(isPreviewableImage(".Png")).toBe(true);
  });
});
