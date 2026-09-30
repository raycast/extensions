import { describe, it, expect } from "vitest";
import { normalizeRelativePath } from "../utils/utils";

describe("normalizeRelativePath", () => {
  it("strips vault prefix and normalizes forward slashes", () => {
    expect(normalizeRelativePath("/Users/me/vault/notes/hello.md", "/Users/me/vault")).toBe("notes/hello.md");
  });

  it("handles Windows backslash paths", () => {
    expect(normalizeRelativePath("C:\\Users\\me\\vault\\notes\\hello.md", "C:\\Users\\me\\vault")).toBe(
      "notes/hello.md"
    );
  });

  it("removes leading separators after prefix removal", () => {
    expect(normalizeRelativePath("/vault/notes/hello.md", "/vault")).toBe("notes/hello.md");
    expect(normalizeRelativePath("\\vault\\notes\\hello.md", "\\vault")).toBe("notes/hello.md");
  });
});
