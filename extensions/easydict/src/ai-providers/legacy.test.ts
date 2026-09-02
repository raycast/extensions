import { describe, expect, it } from "vitest";

import { hasImportedLegacyAIProvider, importLegacyAIProviders } from "./legacy";
import type { StoredAIProviderStateV1 } from "./types";

const legacy = {
  openAI: {
    configured: true,
    enabled: true,
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    apiKey: "openai-placeholder",
    forceMaxCompletionTokens: false,
  },
  gemini: {
    configured: true,
    enabled: false,
    endpoint: "https://generativelanguage.googleapis.com",
    model: "gemini-2.5-flash",
    apiKey: "gemini-placeholder",
  },
};

describe("legacy AI provider import", () => {
  it("normalizes endpoints, preserves enablement, and is idempotent", () => {
    const initial: StoredAIProviderStateV1 = { version: 1, profiles: [] };
    const converted = importLegacyAIProviders(initial, legacy);

    expect(converted.profiles).toMatchObject([
      {
        id: "legacy-openai",
        enabled: true,
        wordResultMode: "translation",
        endpoint: "https://api.openai.com/v1",
        tokenLimitMode: "max-tokens",
        jsonOutputMode: "prompt",
      },
      {
        id: "legacy-gemini",
        enabled: false,
        wordResultMode: "translation",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
        tokenLimitMode: "max-tokens",
        jsonOutputMode: "prompt",
      },
    ]);
    expect(importLegacyAIProviders(converted, legacy)).toBe(converted);
  });

  it("restores only a deleted legacy provider after migration", () => {
    const converted = importLegacyAIProviders({ version: 1, profiles: [] }, legacy);
    const withoutOpenAI: StoredAIProviderStateV1 = {
      ...converted,
      profiles: converted.profiles.filter((profile) => profile.id !== "legacy-openai"),
    };

    const restored = importLegacyAIProviders(withoutOpenAI, legacy);
    expect(hasImportedLegacyAIProvider(withoutOpenAI.profiles, "openai")).toBe(false);
    expect(hasImportedLegacyAIProvider(withoutOpenAI.profiles, "gemini")).toBe(true);
    expect(restored.migration?.legacyPreferencesImported).toBe(true);
    expect(restored.profiles.map((profile) => profile.id)).toEqual(["legacy-gemini", "legacy-openai"]);
    expect(restored.profiles.map((profile) => profile.order)).toEqual([1, 2]);
  });
});
