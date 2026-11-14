import { describe, expect, it } from "vitest";
import { buildQuickAiStdin } from "./quick-ai";

describe("buildQuickAiStdin", () => {
  it("returns the question alone without context", () => {
    expect(buildQuickAiStdin("Why?")).toBe("Why?");
  });

  it("prefixes the context block", () => {
    expect(buildQuickAiStdin("Why?", "Some text")).toBe("Context:\nSome text\n\nQuestion:\nWhy?");
  });

  it("treats blank context as absent", () => {
    expect(buildQuickAiStdin("Why?", "  \n ")).toBe("Why?");
  });
});
