import { describe, expect, it } from "vitest";

import {
  getEffectiveLegacyAIProviderAssignment,
  getImportableLegacyAIProviderNames,
  getLegacyAIProviderReplacement,
  importLegacyAIProviders,
} from "./legacy";
import type { StoredAIProviderStateV1 } from "./types";

const legacy = {
  openai: {
    enabled: true,
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    apiKey: "openai-placeholder",
    forceMaxCompletionTokens: false,
  },
  gemini: {
    enabled: false,
    endpoint: "https://generativelanguage.googleapis.com",
    model: "gemini-2.5-flash",
    apiKey: "gemini-placeholder",
  },
};

describe("legacy AI provider import", () => {
  it("creates ordinary profiles, preserves enablement, and assigns each legacy provider once", () => {
    const initial: StoredAIProviderStateV1 = { version: 1, profiles: [] };
    const converted = importLegacyAIProviders(initial, legacy);
    const [openAIProfile, geminiProfile] = converted.profiles;

    expect(converted.profiles).toMatchObject([
      {
        enabled: true,
        endpoint: "https://api.openai.com/v1",
        tokenLimitMode: "max-tokens",
        jsonOutputMode: "prompt",
      },
      {
        enabled: false,
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
        tokenLimitMode: "max-tokens",
        jsonOutputMode: "prompt",
      },
    ]);
    expect(converted.legacyProviderAssignments).toEqual({
      openai: { kind: "profile", profileId: openAIProfile.id },
      gemini: { kind: "profile", profileId: geminiProfile.id },
    });
    expect(getLegacyAIProviderReplacement(geminiProfile.id, converted.legacyProviderAssignments)).toBe("gemini");
    expect(importLegacyAIProviders(converted, legacy)).toBe(converted);
  });

  it("treats a missing assigned profile as retired until the user restores it", () => {
    const converted = importLegacyAIProviders({ version: 1, profiles: [] }, legacy);
    const withoutProfile: StoredAIProviderStateV1 = { ...converted, profiles: [] };

    expect(
      getEffectiveLegacyAIProviderAssignment(
        "openai",
        withoutProfile.profiles,
        withoutProfile.legacyProviderAssignments,
      ),
    ).toEqual({ kind: "retired" });
    expect(getImportableLegacyAIProviderNames(withoutProfile, legacy)).not.toContain("openai");

    const restored: StoredAIProviderStateV1 = { ...withoutProfile, legacyProviderAssignments: undefined };
    expect(getImportableLegacyAIProviderNames(restored, legacy)).toEqual(["openai", "gemini"]);
  });

  it("imports only the legacy provider selected by the user", () => {
    const converted = importLegacyAIProviders({ version: 1, profiles: [] }, legacy, ["gemini"]);
    const [geminiProfile] = converted.profiles;

    expect(converted.profiles).toHaveLength(1);
    expect(geminiProfile.name).toBe("Gemini");
    expect(converted.legacyProviderAssignments).toEqual({
      gemini: { kind: "profile", profileId: geminiProfile.id },
    });
  });
});
