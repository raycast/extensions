import { describe, expect, it } from "vitest";

import { normalizeAIProviderProfile } from "./profile";
import type { OpenAICompatibleProfile } from "./types";

const profile: OpenAICompatibleProfile = {
  id: "profile-1",
  adapter: "openai-compatible",
  name: "Example",
  enabled: true,
  order: 0,
  icon: { kind: "initials" },
  wordResultMode: "translation",
  endpoint: "https://example.com/v1",
  model: "example-model",
  apiKey: "test-key",
  tokenLimitMode: "max-tokens",
  jsonOutputMode: "prompt",
};

describe("AI provider profiles", () => {
  it("normalizes surrounding whitespace before saving and running a profile", () => {
    const normalized = normalizeAIProviderProfile({
      ...profile,
      name: "  Example  ",
      endpoint: "  https://example.com/v1  ",
      website: "  ",
      model: "  example-model  ",
      apiKey: " \n test-key \t",
    });

    expect(normalized).toMatchObject({
      name: "Example",
      endpoint: "https://example.com/v1",
      website: undefined,
      model: "example-model",
      apiKey: "test-key",
    });
  });
});
