import { describe, expect, it } from "vitest";

import { isSupportedImagePath, resolveClipboardImagePath } from "../clipboard-image";

describe("resolveClipboardImagePath", () => {
  it("uses image file clipboard content", () => {
    expect(resolveClipboardImagePath({ text: "", file: "/tmp/screenshot.png" })).toBe("/tmp/screenshot.png");
  });

  it("uses local image paths copied as text", () => {
    expect(resolveClipboardImagePath({ text: "/tmp/screenshot.heic" })).toBe("/tmp/screenshot.heic");
  });

  it("uses file URLs copied as text", () => {
    expect(resolveClipboardImagePath({ text: "file:///tmp/my%20screenshot.jpg" })).toBe("/tmp/my screenshot.jpg");
  });

  it("ignores unsupported files", () => {
    expect(resolveClipboardImagePath({ text: "", file: "/tmp/readme.txt" })).toBeUndefined();
  });
});

describe("isSupportedImagePath", () => {
  it("accepts common image extensions", () => {
    expect(isSupportedImagePath("/tmp/image.PNG")).toBe(true);
    expect(isSupportedImagePath("/tmp/image.webp")).toBe(true);
    expect(isSupportedImagePath("/tmp/image.tiff")).toBe(true);
  });
});
