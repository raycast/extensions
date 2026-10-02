import { describe, expect, it } from "vitest";

import { getAIProviderCacheIdentity } from "./cacheIdentity";
import type { OpenAICompatibleProfile, RaycastAIProfile } from "./types";

describe("getAIProviderCacheIdentity", () => {
  it("keeps the existing Raycast AI serialization and ignores display-only fields", () => {
    const profile: RaycastAIProfile = {
      id: "raycast",
      name: "Raycast AI",
      enabled: true,
      order: 1,
      icon: { kind: "preset", name: "raycast" },
      wordResultMode: "translation",
      adapter: "raycast-ai",
      model: "model-a",
    };

    expect(getAIProviderCacheIdentity(profile, 1)).toBe(
      JSON.stringify({
        adapter: "raycast-ai",
        model: "model-a",
        wordResultMode: "translation",
        promptVersion: 1,
      }),
    );
    expect(getAIProviderCacheIdentity({ ...profile, name: "Renamed", order: 9, enabled: false }, 1)).toBe(
      getAIProviderCacheIdentity(profile, 1),
    );
    expect(getAIProviderCacheIdentity(profile, 2)).not.toBe(getAIProviderCacheIdentity(profile, 1));
  });

  it("keeps the existing OpenAI-compatible serialization and invalidates request-affecting changes", () => {
    const profile: OpenAICompatibleProfile = {
      id: "openai-compatible",
      name: "OpenAI Compatible",
      enabled: true,
      order: 1,
      icon: { kind: "preset", name: "openai" },
      wordResultMode: "dictionary",
      adapter: "openai-compatible",
      endpoint: "https://api.example.com/v1",
      model: "model-a",
      apiKey: "credential-a",
      tokenLimitMode: "max-tokens",
      jsonOutputMode: "json-object",
    };

    expect(getAIProviderCacheIdentity(profile, 1)).toBe(
      JSON.stringify({
        adapter: "openai-compatible",
        endpoint: "https://api.example.com/v1",
        model: "model-a",
        credential: "credential-a",
        tokenLimitMode: "max-tokens",
        jsonOutputMode: "json-object",
        wordResultMode: "dictionary",
        promptVersion: 1,
      }),
    );
    expect(getAIProviderCacheIdentity({ ...profile, model: "model-b" }, 1)).not.toBe(
      getAIProviderCacheIdentity(profile, 1),
    );
    expect(getAIProviderCacheIdentity({ ...profile, apiKey: "credential-b" }, 1)).not.toBe(
      getAIProviderCacheIdentity(profile, 1),
    );
    expect(getAIProviderCacheIdentity(profile, 2)).not.toBe(getAIProviderCacheIdentity(profile, 1));
  });
});
