import { describe, expect, it } from "vitest";
import { GUESSES } from "../data/wordlists";
import { bestEndgameGuess } from "./solver";

function uniformWeights(length: number): Float64Array {
  return new Float64Array(Array.from({ length }, () => 1 / length));
}

describe("bestEndgameGuess", () => {
  it("returns the only remaining candidate immediately", () => {
    const result = bestEndgameGuess(["cigar"], GUESSES, uniformWeights(1));

    expect(result).toEqual({ word: "cigar", entropy: 0, expectedTurns: 1 });
  });

  it("prefers an in-candidate guess when expected turns tie", () => {
    const candidates = ["cigar", "rebut"];
    const result = bestEndgameGuess(candidates, ["about", ...candidates], uniformWeights(candidates.length));

    expect(result?.word).toBe("cigar");
    expect(result?.expectedTurns).toBe(1.5);
  });

  it("uses a non-answer separator when it lowers expected turns", () => {
    const candidates = ["billy", "dilly", "filly", "willy"];
    const result = bestEndgameGuess(candidates, GUESSES, uniformWeights(candidates.length));

    expect(result?.word).toBe("bowed");
    expect(result?.expectedTurns).toBe(2);
  });
});
