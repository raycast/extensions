import { describe, it, expect } from "vitest";
import { validateAnalysis } from "../../src/llm/validate";
import { EXAMPLE } from "../../src/__fixtures__/analysis";
import type { ProsodyAnalysis } from "../../src/types";

const clone = (): ProsodyAnalysis => JSON.parse(JSON.stringify(EXAMPLE));
const INPUT = EXAMPLE.text; // "If you finish early, give me a call."

describe("validateAnalysis", () => {
  it("passes a clean analysis whose words match the input", () => {
    expect(validateAnalysis(EXAMPLE, INPUT)).toEqual([]);
  });

  it("tolerates punctuation/case differences vs the input", () => {
    expect(
      validateAnalysis(EXAMPLE, "if you finish early give me a call"),
    ).toEqual([]);
  });

  it("flags a sentence the model silently rewrote", () => {
    const v = validateAnalysis(EXAMPLE, "give me a call");
    expect(v.join(" ")).toMatch(/exact sentence/);
  });

  it("does NOT flag a 'rewrite' for generated examples", () => {
    const a = clone();
    a.isGeneratedExample = true;
    expect(validateAnalysis(a, "serendipity")).toEqual([]);
  });

  it("flags words that don't reconstruct the sentence text", () => {
    const a = clone();
    a.thoughtGroups[1].words.pop(); // drop "call"
    expect(validateAnalysis(a, INPUT).join(" ")).toMatch(/do not add up/);
  });

  it("flags syllables that don't spell the word", () => {
    const a = clone();
    a.thoughtGroups[0].words[2].syllables = ["fih", "nish"]; // "finish" misspelt
    expect(validateAnalysis(a, INPUT).join(" ")).toMatch(/syllables for "finish"/);
  });

  it("flags malformed IPA", () => {
    const a = clone();
    a.ipa = "fin ish early";
    expect(validateAnalysis(a, INPUT).join(" ")).toMatch(/IPA/);
  });

  it("flags when nothing is stressed", () => {
    const a = clone();
    for (const g of a.thoughtGroups)
      for (const w of g.words) {
        w.stressed = false;
        w.nuclear = false;
      }
    expect(validateAnalysis(a, INPUT).join(" ")).toMatch(/stressed/);
  });
});
