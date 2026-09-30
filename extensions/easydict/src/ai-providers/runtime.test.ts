import { describe, expect, it, vi } from "vitest";

import { getAIProviderQueryMode } from "./runtime";
import type { OpenAICompatibleProfile } from "./types";

vi.mock("@raycast/api", () => ({ AI: { Model: {} } }));

describe("AI provider query mode", () => {
  it.each([
    { wordResultMode: "translation", isWord: true, expected: "translation" },
    { wordResultMode: "translation", isWord: false, expected: "translation" },
    { wordResultMode: "dictionary", isWord: true, expected: "dictionary" },
    { wordResultMode: "dictionary", isWord: false, expected: "translation" },
  ] as const)(
    "selects exactly one service for $wordResultMode with isWord=$isWord",
    ({ wordResultMode, isWord, expected }) => {
      const profile = createProfile(wordResultMode);

      expect(
        getAIProviderQueryMode(profile, {
          word: isWord ? "run" : "How are you?",
          fromLanguage: "en",
          toLanguage: "zh-CHS",
          isWord,
        }),
      ).toBe(expected);
    },
  );

  it("does not select a service for a disabled provider", () => {
    expect(
      getAIProviderQueryMode(
        { ...createProfile("dictionary"), enabled: false },
        { word: "run", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true },
      ),
    ).toBeUndefined();
  });
});

function createProfile(wordResultMode: OpenAICompatibleProfile["wordResultMode"]): OpenAICompatibleProfile {
  return {
    id: "profile",
    adapter: "openai-compatible",
    name: "Provider",
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode,
    endpoint: "https://example.com/v1",
    model: "model",
    apiKey: "key",
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "prompt",
  };
}
