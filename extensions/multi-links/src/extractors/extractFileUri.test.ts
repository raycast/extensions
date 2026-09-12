import { describe, it, expect } from "vitest";
import { extractFileUri } from "./extractFileUri";

describe("extractFileUri (EXT-05)", () => {
  it("extracts file:// URI", () => {
    const result = extractFileUri("see file:///Users/foo/bar.md please");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "file:///Users/foo/bar.md",
      url: "file:///Users/foo/bar.md",
      type: "local-path",
    });
  });

  it("captures index", () => {
    const result = extractFileUri("xx file:///tmp/a");
    expect(result[0].index).toBe(3);
  });

  it("returns empty for no match", () => {
    expect(extractFileUri("plain text")).toEqual([]);
  });

  it("strips trailing punctuation", () => {
    const result = extractFileUri("see file:///tmp/foo.txt.");
    expect(result[0].raw).toBe("file:///tmp/foo.txt");
  });
});
