import { describe, expect, it } from "vitest";
import { prioritySquircle } from "./priority";

function decode(source: unknown): string {
  if (typeof source === "string") return decodeURIComponent(source);
  if (source && typeof source === "object" && "light" in source) {
    return decodeURIComponent((source as { light: string }).light);
  }
  throw new Error("unexpected source shape");
}

function svg(result: ReturnType<typeof prioritySquircle>): string {
  if (typeof result !== "object" || result === null || !("source" in result)) {
    throw new Error("expected { source } shape");
  }
  return decode((result as { source: unknown }).source);
}

describe("prioritySquircle — A/B/C", () => {
  it("A renders red fill with bold A glyph", () => {
    const out = svg(prioritySquircle("A", false));
    expect(out).toContain('fill="#E5484D"');
    expect(out).toContain('data-letter="A"');
  });

  it("B renders orange fill with bold B glyph", () => {
    const out = svg(prioritySquircle("B", false));
    expect(out).toContain('fill="#F76808"');
    expect(out).toContain('data-letter="B"');
  });

  it("C renders blue fill with bold C glyph", () => {
    const out = svg(prioritySquircle("C", false));
    expect(out).toContain('fill="#0091FF"');
    expect(out).toContain('data-letter="C"');
  });
});

describe("prioritySquircle — D-Z and none", () => {
  it("D renders grey fill (light) with bold D glyph", () => {
    const out = svg(prioritySquircle("D", false));
    expect(out).toContain('fill="#8B8D98"');
    expect(out).toContain('data-letter="D"');
  });

  it("Z renders grey fill (light) with bold Z glyph", () => {
    const out = svg(prioritySquircle("Z", false));
    expect(out).toContain('fill="#8B8D98"');
    expect(out).toContain('data-letter="Z"');
  });

  it("none renders grey fill with no letter glyph", () => {
    const out = svg(prioritySquircle("none", false));
    expect(out).toContain('fill="#8B8D98"');
    expect(out).not.toContain("data-letter=");
  });

  it("grey variants ship distinct light/dark sources", () => {
    const result = prioritySquircle("D", false);
    if (typeof result !== "object" || result === null || !("source" in result)) {
      throw new Error("expected { source } shape");
    }
    const source = (result as { source: unknown }).source;
    expect(typeof source === "object" && source !== null && "light" in source && "dark" in source).toBe(true);
    const dark = decodeURIComponent((source as { dark: string }).dark);
    expect(dark).toContain('fill="#6F6F77"');
  });
});

describe("prioritySquircle — completed", () => {
  it("completed renders green fill with a checkmark <path>", () => {
    const out = svg(prioritySquircle("A", true));
    expect(out).toContain('fill="#30A46C"');
    expect(out).toContain("<path");
    expect(out).not.toContain('data-letter="A"');
  });

  it("completed + none still renders green check", () => {
    const out = svg(prioritySquircle("none", true));
    expect(out).toContain('fill="#30A46C"');
    expect(out).toContain("<path");
    expect(out).not.toContain("data-letter=");
  });

  it("completed wins over any priority letter", () => {
    const out = svg(prioritySquircle("D", true));
    expect(out).toContain('fill="#30A46C"');
    expect(out).not.toContain('data-letter="D"');
  });
});
