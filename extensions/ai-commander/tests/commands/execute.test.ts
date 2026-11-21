import { describe, expect, it } from "vitest";
import { estimateCost, finalizeText } from "../../src/commands/execute";
import type { ResolvedRun } from "../../src/commands/resolve";

const base: ResolvedRun = {
  ref: { provider: "openrouter", modelId: "vendor/model" },
  apiKey: "test",
  reasoning: "default",
  maxOutputTokens: 1000,
};

describe("estimateCost", () => {
  it("needs both prices and usage", () => {
    expect(estimateCost(base, { input: 1, output: 1 })).toBeUndefined();
    const priced = {
      ...base,
      entry: { ref: base.ref, displayName: "M", family: "F", pricing: { inputPerMTok: 1, outputPerMTok: 2 } },
    };
    expect(estimateCost(priced, undefined)).toBeUndefined();
    expect(estimateCost(priced, { input: 1_000_000, output: 500_000 })).toBeCloseTo(2);
  });
});

describe("finalizeText", () => {
  it("refuses text that cleaning leaves empty, because pasting it would delete the selection", () => {
    expect(() => finalizeText("```\n```", "original")).toThrowError(/no usable text/);
  });

  it("returns cleaned text", () => {
    expect(finalizeText("Result", undefined)).toBe("Result");
  });
});
