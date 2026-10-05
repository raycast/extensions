import { describe, expect, it, vi } from "vitest";

const { clipboardRead, existsSync } = vi.hoisted(() => ({
  clipboardRead: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  Clipboard: { read: clipboardRead },
}));

vi.mock("fs", () => ({
  existsSync,
}));

import { isCdnHackclubUrl, isCdnUploadableUrl, resolveClipboardInput } from "./clipboardResolver";

describe("isCdnUploadableUrl", () => {
  it("accepts an http(s) URL on a different host", () => {
    expect(isCdnUploadableUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("rejects a cdn.hackclub.com URL to prevent re-upload loops", () => {
    expect(isCdnUploadableUrl("https://cdn.hackclub.com/abc/def.jpg")).toBe(false);
  });

  it("rejects a non-http(s) scheme", () => {
    expect(isCdnUploadableUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects plain text that isn't a URL", () => {
    expect(isCdnUploadableUrl("just some text")).toBe(false);
  });
});

describe("isCdnHackclubUrl", () => {
  it("accepts a cdn.hackclub.com URL", () => {
    expect(isCdnHackclubUrl("https://cdn.hackclub.com/abc/def.jpg")).toBe(true);
  });

  it("rejects an http(s) URL on a different host", () => {
    expect(isCdnHackclubUrl("https://example.com/photo.jpg")).toBe(false);
  });

  it("rejects a non-http(s) scheme", () => {
    expect(isCdnHackclubUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects plain text that isn't a URL", () => {
    expect(isCdnHackclubUrl("just some text")).toBe(false);
  });
});

describe("resolveClipboardInput", () => {
  it("resolves a copied file with no confirmation needed", async () => {
    clipboardRead.mockResolvedValueOnce({ file: "/Users/gary/photo.png" });
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "file", path: "/Users/gary/photo.png", needsConfirm: false });
  });

  it("resolves clipboard text that is an existing local path, needing confirmation", async () => {
    clipboardRead.mockResolvedValueOnce({ text: "/Users/gary/notes.txt" });
    existsSync.mockReturnValueOnce(true);
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "path-text", path: "/Users/gary/notes.txt", needsConfirm: true });
  });

  it("resolves clipboard text that is a URL, needing confirmation", async () => {
    clipboardRead.mockResolvedValueOnce({ text: "https://example.com/image.jpg" });
    existsSync.mockReturnValueOnce(false);
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "url", url: "https://example.com/image.jpg", needsConfirm: true });
  });

  it("resolves to none for plain text that's neither a path nor a URL", async () => {
    clipboardRead.mockResolvedValueOnce({ text: "just some thoughts" });
    existsSync.mockReturnValueOnce(false);
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "none" });
  });

  it("resolves to none for an empty clipboard", async () => {
    clipboardRead.mockResolvedValueOnce({});
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "none" });
  });

  it("resolves to already-cdn-link for clipboard text that is an existing cdn.hackclub.com URL", async () => {
    clipboardRead.mockResolvedValueOnce({ text: "https://cdn.hackclub.com/abc123/photo.jpg" });
    existsSync.mockReturnValueOnce(false);
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "already-cdn-link" });
  });

  it("normalizes a file:// URI from the clipboard into a plain, percent-decoded path", async () => {
    clipboardRead.mockResolvedValueOnce({
      file: "file:///var/folders/pc/tpffp_k51v338_hqsl5z2pdw0000gn/T/Image%20(996).png",
    });
    const result = await resolveClipboardInput();
    expect(result).toEqual({
      type: "file",
      path: "/var/folders/pc/tpffp_k51v338_hqsl5z2pdw0000gn/T/Image (996).png",
      needsConfirm: false,
    });
  });
});
