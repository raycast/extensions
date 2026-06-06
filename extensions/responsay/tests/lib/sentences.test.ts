import { describe, it, expect } from "vitest";
import {
  splitSentences,
  resolveSentencesPerPage,
} from "../../src/lib/sentences";

describe("splitSentences", () => {
  it("splits on sentence boundaries", () => {
    expect(splitSentences("Hello world. How are you? Fine!")).toEqual([
      "Hello world.",
      "How are you?",
      "Fine!",
    ]);
  });
  it("returns a single-element array for one sentence", () => {
    expect(splitSentences("Just one sentence")).toEqual(["Just one sentence"]);
  });
  it("returns empty for blank input", () => {
    expect(splitSentences("   ")).toEqual([]);
  });
  it("does not split common abbreviations or decimals", () => {
    expect(splitSentences("Dr. Smith scored 3.5 points. Really?")).toEqual([
      "Dr. Smith scored 3.5 points.",
      "Really?",
    ]);
  });
  it("does not split English initialisms into one-letter fragments", () => {
    expect(
      splitSentences("Trump Is Dominating G.O.P. Politics. Really?"),
    ).toEqual(["Trump Is Dominating G.O.P. Politics.", "Really?"]);
  });
});

describe("resolveSentencesPerPage", () => {
  it("defaults to five and clamps to the player bounds", () => {
    expect(resolveSentencesPerPage(undefined)).toBe(5);
    expect(resolveSentencesPerPage("0")).toBe(1);
    expect(resolveSentencesPerPage("50")).toBe(12);
    expect(resolveSentencesPerPage("7.8")).toBe(7);
  });
});
