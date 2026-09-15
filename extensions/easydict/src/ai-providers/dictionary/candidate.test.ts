/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { describe, expect, it } from "vitest";

import type { QueryInput } from "@/types/query";

import { isAIDictionaryCandidate } from "./candidate";

describe("isAIDictionaryCandidate", () => {
  it("honors an explicit dictionary decision from an upstream provider", () => {
    expect(isAIDictionaryCandidate(createQuery("This looks like a sentence.", true))).toBe(true);
    expect(isAIDictionaryCandidate(createQuery("word", false))).toBe(false);
  });

  it.each(["run", "state-of-the-art", "don't", "machine learning", "生产力"])(
    "accepts a word or short term: %s",
    (source) => {
      expect(isAIDictionaryCandidate(createQuery(source))).toBe(true);
    },
  );

  it.each([
    "How are you?",
    "first line\nsecond line",
    "one two three four five six",
    "所以不像词典服务整体故障",
    "https://example.com",
    "12345",
  ])("rejects an obvious non-term: %s", (source) => {
    expect(isAIDictionaryCandidate(createQuery(source))).toBe(false);
  });
});

function createQuery(word: string, isWord?: boolean): QueryInput {
  return { word, fromLanguage: "en", toLanguage: "zh-CHS", isWord };
}
