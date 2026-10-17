import { describe, expect, it } from "vitest";
import { formatLatex } from "../lib/output";

describe("formatLatex", () => {
  it("formats all three output modes", () => {
    expect(formatLatex("  \\frac{x}{y}  ", "raw")).toBe("\\frac{x}{y}");
    expect(formatLatex("\\frac{x}{y}", "inline")).toBe("$\\frac{x}{y}$");
    expect(formatLatex("\\frac{x}{y}", "display")).toBe("$$\n\\frac{x}{y}\n$$");
  });
});
