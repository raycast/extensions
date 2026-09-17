import { describe, expect, it } from "vitest";

import {
  getAIProviderProfileValidationError,
  getOpenAICompatibleProfileValidationError,
  normalizeAIProviderProfile,
} from "./profile";
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
  it("rejects an empty provider name", () => {
    expect(getAIProviderProfileValidationError({ ...profile, name: "\t" })).toBe("Enter a provider name.");
  });

  it("rejects an empty endpoint", () => {
    const invalid = { ...profile, endpoint: " \n " };

    expect(getOpenAICompatibleProfileValidationError(invalid)).toBe("Enter an API base URL.");
  });

  it("rejects endpoint protocols other than HTTP and HTTPS", () => {
    const invalid = { ...profile, endpoint: "ftp://example.com/v1" };

    expect(getOpenAICompatibleProfileValidationError(invalid)).toBe("Enter a valid HTTP or HTTPS API base URL.");
  });

  it("accepts a valid keyless OpenAI-compatible profile", () => {
    const keyless = { ...profile, apiKey: "\t\n" };

    expect(getOpenAICompatibleProfileValidationError(keyless)).toBeUndefined();
  });

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
    expect(getAIProviderProfileValidationError(normalized)).toBeUndefined();
  });
});
