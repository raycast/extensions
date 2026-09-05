import { describe, expect, it } from "vitest";

import { getAIProviderTestFingerprint } from "./testFingerprint";
import type { OpenAICompatibleProfile } from "./types";

const profile: OpenAICompatibleProfile = {
  id: "profile-1",
  adapter: "openai-compatible",
  name: "Example",
  enabled: true,
  order: 0,
  icon: { kind: "initials" },
  wordResultMode: "dictionary",
  endpoint: "https://example.com/v1",
  model: "example-model",
  apiKey: "test-key",
  tokenLimitMode: "max-tokens",
  jsonOutputMode: "json-object",
};

describe("AI provider test fingerprint", () => {
  it("ignores presentation-only changes", () => {
    expect(
      getAIProviderTestFingerprint({
        ...profile,
        name: "Renamed",
        icon: { kind: "preset", name: "openai" },
        website: "https://example.com",
        enabled: false,
        order: 4,
      }),
    ).toBe(getAIProviderTestFingerprint(profile));
  });

  it.each(["endpoint", "model", "apiKey", "tokenLimitMode", "jsonOutputMode", "wordResultMode"] as const)(
    "changes when %s changes",
    (field) => {
      const changedValues = {
        endpoint: "https://other.example/v1",
        model: "other-model",
        apiKey: "other-key",
        tokenLimitMode: "max-completion-tokens",
        jsonOutputMode: "prompt",
        wordResultMode: "translation",
      } as const;
      expect(getAIProviderTestFingerprint({ ...profile, [field]: changedValues[field] })).not.toBe(
        getAIProviderTestFingerprint(profile),
      );
    },
  );
});
