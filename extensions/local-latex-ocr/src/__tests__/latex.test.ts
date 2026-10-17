import { describe, expect, it } from "vitest";
import { getReviewReasons, hasBalancedLatex, isKatexValid, postProcessLatex } from "../lib/latex";

describe("LaTeX validation", () => {
  it("recognizes balanced nested groups and environments", () => {
    expect(hasBalancedLatex("\\frac{x^{2}}{y}")).toBe(true);
    expect(hasBalancedLatex("\\begin{aligned}x&=1\\\\y&=2\\end{aligned}")).toBe(true);
    expect(hasBalancedLatex("\\frac{x}{y")).toBe(false);
    expect(hasBalancedLatex("\\begin{matrix}x\\end{cases}")).toBe(false);
  });

  it("checks KaTeX syntax", () => {
    expect(isKatexValid("\\frac{x}{y}")).toBe(true);
    expect(isKatexValid("\\definitelyNotARealCommand{x}")).toBe(false);
  });

  it("matches upstream whitespace cleanup", () => {
    expect(postProcessLatex("x ^ { 2 } + y")).toBe("x^{2}+y");
  });

  it("unwraps display delimiters emitted by image-to-LaTeX models", () => {
    expect(postProcessLatex("\\[\\frac{x}{y}\\]")).toBe("\\frac{x}{y}");
    expect(postProcessLatex("$$\\frac{x}{y}$$")).toBe("\\frac{x}{y}");
  });

  it("routes malformed and uncertain output to review", () => {
    const reasons = getReviewReasons({
      latex: "\\frac{x}{y",
      meanTokenProbability: 0.5,
      minimumTokenProbability: 0.01,
      eosReached: false,
      tokenCount: 512,
      maxTokenCount: 512,
    });
    expect(reasons).toContain("The model did not emit an end token");
    expect(reasons).toContain("The result reached the token limit");
    expect(reasons).toContain("LaTeX braces or environments are unbalanced");
    expect(reasons).toContain("Average token confidence is low");
  });
});
