import { describe, expect, it } from "vitest";
import { memoTitle } from "../../src/components/memoTitle";

describe("memoTitle", () => {
  it("uses the first non-empty line without markdown markers", () => {
    expect(memoTitle("\n\n## Weekly review\nbody")).toBe("Weekly review");
    expect(memoTitle("- [ ] buy milk")).toBe("buy milk");
    expect(memoTitle("> quoted thought")).toBe("quoted thought");
  });

  it("truncates long lines", () => {
    expect(memoTitle("a".repeat(100))).toBe(`${"a".repeat(79)}…`);
  });

  it("falls back for empty content", () => {
    expect(memoTitle("   \n ")).toBe("Untitled memo");
  });
});
