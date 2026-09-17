import { describe, it, expect } from "vitest";
import { extractCustomScheme } from "./extractCustomScheme";

describe("extractCustomScheme (EXT-08)", () => {
  it("extracts obsidian://", () => {
    const result = extractCustomScheme("open obsidian://open?vault=Notes here");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "obsidian://open?vault=Notes",
      url: "obsidian://open?vault=Notes",
      type: "custom-scheme",
    });
  });

  it("extracts raycast://, vscode://, notion://", () => {
    const result = extractCustomScheme("a raycast://extensions/x b vscode://file/y c notion://z");
    expect(result.map((i) => i.url)).toEqual(["raycast://extensions/x", "vscode://file/y", "notion://z"]);
  });

  it("does NOT match http:// (owned by extractHttp)", () => {
    expect(extractCustomScheme("https://example.com")).toEqual([]);
    expect(extractCustomScheme("http://example.com")).toEqual([]);
  });

  it("does NOT match file:// (owned by extractFileUri)", () => {
    expect(extractCustomScheme("file:///tmp/foo")).toEqual([]);
  });

  it("captures index", () => {
    const result = extractCustomScheme("xx cursor://foo");
    expect(result[0].index).toBe(3);
  });
});
