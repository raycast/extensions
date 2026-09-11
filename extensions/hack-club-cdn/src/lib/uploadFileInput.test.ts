import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Clipboard: { read: vi.fn() },
}));

import { resolveUploadFileInput, stripSurroundingQuotes } from "./uploadFileInput";

describe("stripSurroundingQuotes", () => {
  it("strips matching double quotes", () => {
    expect(stripSurroundingQuotes('"/Users/me/file.png"')).toBe("/Users/me/file.png");
  });

  it("strips matching single quotes", () => {
    expect(stripSurroundingQuotes("'/Users/me/file.png'")).toBe("/Users/me/file.png");
  });

  it("strips matching backticks", () => {
    expect(stripSurroundingQuotes("`/Users/me/file.png`")).toBe("/Users/me/file.png");
  });

  it("does not strip mismatched quote types", () => {
    expect(stripSurroundingQuotes(`"/path'`)).toBe(`"/path'`);
  });

  it("no-ops on an unquoted string", () => {
    expect(stripSurroundingQuotes("/Users/me/file.png")).toBe("/Users/me/file.png");
  });

  it("no-ops on a string shorter than 2 characters", () => {
    expect(stripSurroundingQuotes('"')).toBe('"');
  });

  it("no-ops on an empty string", () => {
    expect(stripSurroundingQuotes("")).toBe("");
  });
});

describe("resolveUploadFileInput", () => {
  it("returns empty when no file and empty path text", () => {
    expect(resolveUploadFileInput(undefined, "")).toEqual({ kind: "empty" });
  });

  it("returns empty when no file and whitespace-only path text", () => {
    expect(resolveUploadFileInput(undefined, "   ")).toEqual({ kind: "empty" });
  });

  it("prefers the file picker path even when path text is also present", () => {
    expect(resolveUploadFileInput("/Users/me/picked.png", "https://example.com/photo.jpg")).toEqual({
      kind: "file",
      path: "/Users/me/picked.png",
    });
  });

  it("prefers the file picker path when path text is empty", () => {
    expect(resolveUploadFileInput("/Users/me/picked.png", "")).toEqual({
      kind: "file",
      path: "/Users/me/picked.png",
    });
  });

  it("resolves a plain local-looking path with no file picker selection", () => {
    expect(resolveUploadFileInput(undefined, "/Users/me/photo.png")).toEqual({
      kind: "file",
      path: "/Users/me/photo.png",
    });
  });

  it("strips quotes from a quoted local path", () => {
    expect(resolveUploadFileInput(undefined, '"/Users/me/photo.png"')).toEqual({
      kind: "file",
      path: "/Users/me/photo.png",
    });
  });

  it("detects a cdn.hackclub.com URL as already-cdn-link", () => {
    expect(resolveUploadFileInput(undefined, "https://cdn.hackclub.com/abc123/photo.jpg")).toEqual({
      kind: "already-cdn-link",
    });
  });

  it("detects a quoted cdn.hackclub.com URL as already-cdn-link after stripping", () => {
    expect(resolveUploadFileInput(undefined, '"https://cdn.hackclub.com/abc123/photo.jpg"')).toEqual({
      kind: "already-cdn-link",
    });
  });

  it("detects another uploadable URL", () => {
    expect(resolveUploadFileInput(undefined, "https://example.com/photo.jpg")).toEqual({
      kind: "url",
      url: "https://example.com/photo.jpg",
    });
  });

  it("strips quotes from a quoted uploadable URL before classifying it as url", () => {
    expect(resolveUploadFileInput(undefined, '"https://example.com/photo.jpg"')).toEqual({
      kind: "url",
      url: "https://example.com/photo.jpg",
    });
  });
});
