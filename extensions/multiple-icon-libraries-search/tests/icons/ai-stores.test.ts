import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL,
  isRateLimitError,
  keywordPrompt,
  LEGACY_RECOMMENDED,
  LOWER_COST_MODEL,
  MODEL_MEMORY_MS,
  modelOrder,
  parseKeywords,
  pruneCallTimes,
  shouldAskAi,
  withinRateLimit,
} from "../../src/icons/ai";
import {
  addSavedKeyword,
  forgetSavedKeywords,
  frecency,
  recordUse,
  sample,
  toggleFavorite,
  topUsed,
} from "../../src/icons/stores";

describe("AI keywords", () => {
  it("puts the query in the prompt", () => {
    expect(keywordPrompt("  person waving goodbye ")).toContain("Idea: person waving goodbye");
  });

  it("parses comma, line, bullet, and numbered replies", () => {
    expect(parseKeywords("Wave, hand,  goodbye.")).toEqual(["wave", "hand", "goodbye"]);
    expect(parseKeywords('1. "wave"\n2) hand\n- farewell\n• bye')).toEqual(["wave", "hand", "farewell", "bye"]);
    expect(parseKeywords("Here are keywords: x, wave, wave")).toEqual(["wave"]);
    expect(parseKeywords(Array.from({ length: 30 }, (_, i) => `k${i}`).join(","))).toHaveLength(15);
  });
});

describe("AI rate limit", () => {
  const now = 10_000_000;

  it("allows 10 calls a minute and 100 an hour", () => {
    expect(withinRateLimit([], now)).toBe(true);
    expect(withinRateLimit(Array(9).fill(now - 1000), now)).toBe(true);
    expect(withinRateLimit(Array(10).fill(now - 1000), now)).toBe(false);
    expect(withinRateLimit(Array(10).fill(now - 61_000), now)).toBe(true);
    expect(withinRateLimit(Array(100).fill(now - 30 * 60_000), now)).toBe(false);
  });

  it("forgets calls older than an hour", () => {
    expect(pruneCallTimes([now - 3_700_000, now - 10], now)).toEqual([now - 10]);
  });
});

describe("shouldAskAi", () => {
  it("asks on its own only when keywords found less than a row", () => {
    expect(shouldAskAi("ticket", 12, false)).toBe("none");
    expect(shouldAskAi("person waving goodbye", 0, false)).toBe("auto");
    expect(shouldAskAi("waving", 7, false)).toBe("auto");
    expect(shouldAskAi("wave", 8, false)).toBe("none");
    expect(shouldAskAi("ticket", 12, true)).toBe("tab");
    expect(shouldAskAi("  ", 0, true)).toBe("none");
  });
});

describe("favorites", () => {
  it("toggles", () => {
    expect(toggleFavorite(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleFavorite(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("frequently used", () => {
  const day = 24 * 60 * 60 * 1000;

  it("ranks by count, fading older uses", () => {
    let uses = recordUse({}, "old", 0);
    uses = recordUse(uses, "old", 0);
    uses = recordUse(uses, "old", 0);
    uses = recordUse(uses, "recent", 60 * day);
    expect(frecency(uses.old, 28 * day)).toBeCloseTo(0.75);
    expect(topUsed(uses, 5, 60 * day)).toEqual(["recent", "old"]);
    expect(topUsed(uses, 5, 0)).toEqual(["old", "recent"]);
    expect(topUsed(uses, 1, 60 * day, new Set(["recent"]))).toEqual(["old"]);
  });
});

describe("saved keywords", () => {
  it("adds normalized phrases once, and forgets them", () => {
    let saved = addSavedKeyword({}, "hand", "Person  waving goodbye");
    saved = addSavedKeyword(saved, "hand", "person waving goodbye");
    saved = addSavedKeyword(saved, "hand", "  ");
    expect(saved).toEqual({ hand: ["person waving goodbye"] });
    expect(forgetSavedKeywords(saved, "hand")).toEqual({});
  });
});

describe("sample", () => {
  it("picks without repeats", () => {
    const picked = sample([1, 2, 3, 4, 5], 3, () => 0);
    expect(picked).toEqual([1, 2, 3]);
    expect(sample([1, 2], 5)).toHaveLength(2);
  });
});

describe("modelOrder", () => {
  const now = 1_000_000_000_000;
  const mini = "openai-gpt-5.4-mini";

  it("tries the picked model, then Raycast's default", () => {
    expect(modelOrder(mini, undefined, 0, now)).toEqual([mini, DEFAULT_MODEL]);
    expect(modelOrder(LOWER_COST_MODEL, undefined, 0, now)).toEqual([LOWER_COST_MODEL, DEFAULT_MODEL]);
  });

  it("treats a missing setting or the old Recommended value as Lower Cost", () => {
    expect(modelOrder(undefined, undefined, 0, now)).toEqual([LOWER_COST_MODEL, DEFAULT_MODEL]);
    expect(modelOrder(LEGACY_RECOMMENDED, undefined, 0, now)).toEqual([LOWER_COST_MODEL, DEFAULT_MODEL]);
  });

  it("asks only the default once when the default is picked", () => {
    expect(modelOrder(DEFAULT_MODEL, undefined, 0, now)).toEqual([DEFAULT_MODEL]);
  });

  it("goes straight to the default while it is remembered as the one that answered, when the plan lacks the pick", () => {
    expect(modelOrder(mini, DEFAULT_MODEL, now - 1000, now)).toEqual([DEFAULT_MODEL, mini]);
  });

  it("tries the picked model again once the memory is old, and ignores a remembered model outside this pick", () => {
    expect(modelOrder(mini, DEFAULT_MODEL, now - MODEL_MEMORY_MS, now)).toEqual([mini, DEFAULT_MODEL]);
    expect(modelOrder(mini, "retired-model", now, now)).toEqual([mini, DEFAULT_MODEL]);
  });
});

describe("isRateLimitError", () => {
  it("spots Raycast's limit, not other failures", () => {
    expect(isRateLimitError(new Error("Too many requests. Please try again shortly."))).toBe(true);
    expect(isRateLimitError(new Error("Model not available on your plan"))).toBe(false);
  });
});
