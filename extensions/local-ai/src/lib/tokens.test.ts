import { describe, expect, it } from "vitest";
import {
  checkBudget,
  commandInputLimit,
  contextPercent,
  inputTokensFrom,
  questionInputLimit,
  selectHistory,
} from "./tokens";

describe("input limits", () => {
  it("splits the free window between input and output for commands", () => {
    expect(commandInputLimit(63)).toBe(1966);
    expect(commandInputLimit(4000)).toBe(0);
  });

  it("reserves the answer for questions", () => {
    expect(questionInputLimit(63)).toBe(2933);
    expect(questionInputLimit(3500)).toBe(0);
  });
});

describe("checkBudget", () => {
  it("accepts input at the limit", () => {
    expect(checkBudget(1966, 1966).ok).toBe(true);
  });

  it("rejects input over the limit with a message", () => {
    expect(checkBudget(1967, 1966)).toEqual({
      ok: false,
      tokens: 1967,
      limit: 1966,
      message: "Text is too long for the on-device model (1967 tokens, limit 1966)",
    });
  });
});

describe("selectHistory", () => {
  const turns = [
    { userTokens: 10, assistantTokens: 20 },
    { userTokens: 30, assistantTokens: 40 },
    { userTokens: 50, assistantTokens: 60 },
  ];

  it("keeps the newest turns that fit, counting turn and header overhead", () => {
    expect(selectHistory(turns, 120)).toEqual({ startIndex: 3, usedTokens: 0 });
    expect(selectHistory(turns, 140)).toEqual({ startIndex: 2, usedTokens: 134 });
    expect(selectHistory(turns, 220)).toEqual({ startIndex: 1, usedTokens: 212 });
    expect(selectHistory(turns, 0)).toEqual({ startIndex: 3, usedTokens: 0 });
    expect(selectHistory(turns, 1000)).toEqual({ startIndex: 0, usedTokens: 250 });
  });

  it("drops tiny turns that fit by content alone once labels are counted", () => {
    const tiny = Array.from({ length: 100 }, () => ({ userTokens: 5, assistantTokens: 5 }));
    expect(selectHistory(tiny, 1000)).toEqual({ startIndex: 46, usedTokens: 988 });
  });
});

describe("contextPercent", () => {
  it("rounds and caps at 100", () => {
    expect(contextPercent(2048)).toBe(50);
    expect(contextPercent(9999)).toBe(100);
  });
});

describe("inputTokensFrom", () => {
  it("subtracts framing from the combined count", () => {
    expect(inputTokensFrom(120, 50)).toBe(70);
  });

  it("never goes below zero", () => {
    expect(inputTokensFrom(40, 50)).toBe(0);
  });
});
