import { describe, expect, it } from "vitest";

import { getAIProviderKey, getBuiltinProviderKey } from "@/core/query/providerOrder";
import { TranslationType } from "@/types/api";

import { createProfileFromLegacySettings, migrateLegacyAIProviderState } from "./legacy";
import type { StoredAIProviderState, StoredAIProviderStateV1 } from "./types";

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

const openAIKey = getBuiltinProviderKey("translation", TranslationType.OpenAI);
const geminiKey = getBuiltinProviderKey("translation", TranslationType.Gemini);
const googleKey = getBuiltinProviderKey("translation", TranslationType.Google);
const bingKey = getBuiltinProviderKey("translation", TranslationType.Bing);
const builtins = [
  { providerKey: googleKey, type: TranslationType.Google, serviceOrder: 0 },
  { providerKey: bingKey, type: TranslationType.Bing, serviceOrder: 1 },
];

describe("one-time legacy AI provider migration", () => {
  it("preserves legacy connection settings, enablement, and custom ordering on first migration", () => {
    const initial: StoredAIProviderStateV1 = {
      version: 1,
      profiles: [],
      providerOrder: [googleKey, geminiKey, bingKey, openAIKey],
    };
    const migrated = migrateLegacyAIProviderState(initial, legacy, builtins);
    const [openai, gemini] = migrated.profiles;
    expect(migrated.profiles).toMatchObject([
      {
        name: "OpenAI",
        enabled: true,
        endpoint: "https://api.openai.com/v1",
        apiKey: legacy.openai.apiKey,
        model: legacy.openai.model,
        tokenLimitMode: "max-tokens",
        jsonOutputMode: "prompt",
      },
      {
        name: "Gemini",
        enabled: false,
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: legacy.gemini.apiKey,
        model: legacy.gemini.model,
      },
    ]);
    expect(migrated.providerOrder).toEqual([googleKey, getAIProviderKey(gemini), bingKey, getAIProviderKey(openai)]);
    expect(migrated).not.toHaveProperty("legacyProviderAssignments");
    expect(migrated.migratedLegacyProviders).toEqual(["openai", "gemini"]);
    expect(migrateLegacyAIProviderState(migrated, legacy, builtins)).toBe(migrated);
  });

  it("initializes migrated provider positions from the legacy service-order preference", () => {
    const migrated = migrateLegacyAIProviderState({ version: 1, profiles: [] }, legacy, builtins, [
      "gemini",
      "google",
      "openai",
    ]);
    expect(migrated.providerOrder).toEqual([
      getAIProviderKey(migrated.profiles[1]),
      googleKey,
      getAIProviderKey(migrated.profiles[0]),
      bingKey,
    ]);
  });

  it("keeps an edited replacement's identity and configuration while converting its legacy order key", () => {
    const profile = {
      ...createProfileFromLegacySettings("openai", legacy, 0),
      name: "My Proxy",
      enabled: false,
      endpoint: "https://example.com/v1",
      model: "custom-model",
      wordResultMode: "dictionary" as const,
    };
    const migrated = migrateLegacyAIProviderState(
      {
        version: 1,
        profiles: [profile],
        providerOrder: [googleKey, openAIKey, bingKey, geminiKey],
        legacyProviderAssignments: { openai: { kind: "profile", profileId: profile.id }, gemini: { kind: "retired" } },
      },
      legacy,
      builtins,
    );
    expect(migrated.profiles).toEqual([profile]);
    expect(migrated.providerOrder).toEqual([googleKey, getAIProviderKey(profile), bingKey]);
    expect(migrated.migratedLegacyProviders).toEqual(["openai", "gemini"]);
  });

  it("does not recreate retired providers or missing replacement profiles", () => {
    const migrated = migrateLegacyAIProviderState(
      {
        version: 1,
        profiles: [],
        legacyProviderAssignments: { openai: { kind: "retired" }, gemini: { kind: "profile", profileId: "deleted" } },
      },
      legacy,
      builtins,
    );
    expect(migrated.profiles).toEqual([]);
    expect(migrated.migratedLegacyProviders).toEqual(["openai", "gemini"]);
    expect(migrateLegacyAIProviderState(migrated, legacy, builtins)).toBe(migrated);
  });

  it("waits for credentials on a new device and imports each source only when it becomes available", () => {
    const initial: StoredAIProviderState = { version: 2, profiles: [], migratedLegacyProviders: [] };
    const missing = { ...legacy, openai: { ...legacy.openai, apiKey: " " }, gemini: { ...legacy.gemini, apiKey: "" } };
    expect(migrateLegacyAIProviderState(initial, missing, builtins)).toBe(initial);
    const first = migrateLegacyAIProviderState(initial, { ...missing, openai: legacy.openai }, builtins);
    expect(first.profiles).toHaveLength(1);
    expect(first.migratedLegacyProviders).toEqual(["openai"]);
    expect(first.legacyProviderAssignments).toEqual({ openai: { kind: "profile", profileId: first.profiles[0].id } });
    const second = migrateLegacyAIProviderState(first, legacy, builtins);
    expect(second.profiles).toHaveLength(2);
    expect(second.profiles[0]).toEqual(first.profiles[0]);
    expect(second).not.toHaveProperty("legacyProviderAssignments");
    expect(migrateLegacyAIProviderState(second, legacy, builtins)).toBe(second);
  });

  it.each([
    {
      firstProvider: "openai" as const,
      expected: ["OpenAI", "Gemini", "Google", "Bing"],
    },
    {
      firstProvider: "gemini" as const,
      expected: ["OpenAI", "Gemini", "Google", "Bing"],
    },
  ])("restores the delayed slot after $firstProvider was imported and edited", ({ firstProvider, expected }) => {
    const delayedProvider = firstProvider === "openai" ? "gemini" : "openai";
    const first = migrateLegacyAIProviderState(
      { version: 1, profiles: [] },
      { ...legacy, [delayedProvider]: { ...legacy[delayedProvider], apiKey: "" } },
      builtins,
    );
    const editedProfile = {
      ...first.profiles[0],
      name: "Edited Import",
      icon: { kind: "initials" as const },
      wordResultMode: "dictionary" as const,
      ...(first.profiles[0].adapter === "openai-compatible"
        ? { endpoint: "https://example.com/v1", model: "edited-model" }
        : {}),
    };
    const second = migrateLegacyAIProviderState({ ...first, profiles: [editedProfile] }, legacy, builtins);
    const names = new Map([
      [googleKey, "Google"],
      [bingKey, "Bing"],
      ...second.profiles.map(
        (profile) =>
          [
            getAIProviderKey(profile),
            profile.id === editedProfile.id ? (firstProvider === "openai" ? "OpenAI" : "Gemini") : profile.name,
          ] as const,
      ),
    ]);
    expect(second.providerOrder?.map((key) => names.get(key))).toEqual(expected);
    expect(second.profiles.find((profile) => profile.id === editedProfile.id)).toMatchObject({
      id: editedProfile.id,
      name: "Edited Import",
      icon: { kind: "initials" },
      wordResultMode: "dictionary",
      endpoint: "https://example.com/v1",
      model: "edited-model",
    });
  });

  it("uses the temporary source mapping with a custom saved order", () => {
    const first = migrateLegacyAIProviderState(
      { version: 1, profiles: [] },
      { ...legacy, openai: { ...legacy.openai, apiKey: "" } },
      builtins,
      ["google", "openai", "gemini", "bing"],
    );
    const geminiProfileKey = getAIProviderKey(first.profiles[0]);
    const second = migrateLegacyAIProviderState(
      { ...first, providerOrder: [bingKey, geminiProfileKey, googleKey] },
      legacy,
      builtins,
      ["google", "openai", "gemini", "bing"],
    );
    expect(second.providerOrder).toEqual([bingKey, getAIProviderKey(second.profiles[1]), geminiProfileKey, googleKey]);
  });

  it("does not recreate a mapped import deleted before the other source becomes available", () => {
    const first = migrateLegacyAIProviderState(
      { version: 1, profiles: [] },
      { ...legacy, openai: { ...legacy.openai, apiKey: "" } },
      builtins,
    );
    const second = migrateLegacyAIProviderState({ ...first, profiles: [] }, legacy, builtins);
    expect(second.profiles).toHaveLength(1);
    expect(second.profiles[0].name).toBe("OpenAI");
    expect(second.migratedLegacyProviders).toEqual(["openai", "gemini"]);
    expect(second).not.toHaveProperty("legacyProviderAssignments");
  });

  it.each([
    { delayedProvider: "gemini" as const, servicesOrder: [], expected: ["OpenAI", "Gemini", "Google", "Bing"] },
    {
      delayedProvider: "gemini" as const,
      servicesOrder: ["openai", "gemini"],
      expected: ["OpenAI", "Gemini", "Google", "Bing"],
    },
    {
      delayedProvider: "gemini" as const,
      servicesOrder: ["gemini", "openai"],
      expected: ["Gemini", "OpenAI", "Google", "Bing"],
    },
    {
      delayedProvider: "gemini" as const,
      servicesOrder: ["google", "gemini", "openai"],
      expected: ["Google", "Gemini", "OpenAI", "Bing"],
    },
    {
      delayedProvider: "gemini" as const,
      servicesOrder: ["gemini", "google", "openai"],
      expected: ["Gemini", "Google", "OpenAI", "Bing"],
    },
    {
      delayedProvider: "gemini" as const,
      servicesOrder: ["google", "bing", "openai", "gemini"],
      expected: ["Google", "Bing", "OpenAI", "Gemini"],
    },
    { delayedProvider: "openai" as const, servicesOrder: [], expected: ["OpenAI", "Gemini", "Google", "Bing"] },
    {
      delayedProvider: "openai" as const,
      servicesOrder: ["openai", "gemini"],
      expected: ["OpenAI", "Gemini", "Google", "Bing"],
    },
    {
      delayedProvider: "openai" as const,
      servicesOrder: ["gemini", "openai"],
      expected: ["Gemini", "OpenAI", "Google", "Bing"],
    },
  ])(
    "restores delayed $delayedProvider's position for service order $servicesOrder",
    ({ delayedProvider, servicesOrder, expected }) => {
      const first = migrateLegacyAIProviderState(
        { version: 1, profiles: [] },
        { ...legacy, [delayedProvider]: { ...legacy[delayedProvider], apiKey: "" } },
        builtins,
        servicesOrder,
      );
      const second = migrateLegacyAIProviderState(first, legacy, builtins, servicesOrder);
      const names = new Map([
        [googleKey, "Google"],
        [bingKey, "Bing"],
        ...second.profiles.map((profile) => [getAIProviderKey(profile), profile.name] as const),
      ]);
      expect(second.providerOrder?.map((key) => names.get(key))).toEqual(expected);
    },
  );

  it("preserves saved relative order when restoring a missing legacy slot", () => {
    const first = migrateLegacyAIProviderState(
      { version: 1, profiles: [] },
      { ...legacy, gemini: { ...legacy.gemini, apiKey: "" } },
      builtins,
    );
    const savedOrder = [bingKey, getAIProviderKey(first.profiles[0]), googleKey];
    const second = migrateLegacyAIProviderState({ ...first, providerOrder: savedOrder }, legacy, builtins);
    expect(second.providerOrder).toEqual([
      bingKey,
      getAIProviderKey(first.profiles[0]),
      getAIProviderKey(second.profiles[1]),
      googleKey,
    ]);
  });

  it("does not reimport deleted providers even when the old preferences change", () => {
    const migrated = migrateLegacyAIProviderState({ version: 1, profiles: [] }, legacy, builtins);
    const deleted = { ...migrated, profiles: [] };
    const changed = { ...legacy, openai: { ...legacy.openai, apiKey: "new-placeholder", model: "new-model" } };
    expect(migrateLegacyAIProviderState(deleted, changed, builtins)).toBe(deleted);
    expect(createProfileFromLegacySettings("openai", changed, 0)).toMatchObject({
      apiKey: "new-placeholder",
      model: "new-model",
    });
  });

  it("does not merge an independently created provider based on its name or endpoint", () => {
    const existing = createProfileFromLegacySettings("openai", legacy, 0);
    const migrated = migrateLegacyAIProviderState({ version: 1, profiles: [existing] }, legacy, builtins);
    expect(migrated.profiles).toHaveLength(3);
    expect(migrated.profiles[0].id).toBe(existing.id);
    expect(new Set(migrated.profiles.map((profile) => profile.id)).size).toBe(3);
  });

  it("preserves the forced token parameter and accepts a full Gemini completion URL", () => {
    expect(
      createProfileFromLegacySettings(
        "openai",
        { ...legacy, openai: { ...legacy.openai, forceMaxCompletionTokens: true } },
        0,
      ).tokenLimitMode,
    ).toBe("max-completion-tokens");
    expect(
      createProfileFromLegacySettings(
        "gemini",
        { ...legacy, gemini: { ...legacy.gemini, endpoint: "https://example.com/v1beta/openai/chat/completions/" } },
        0,
      ).endpoint,
    ).toBe("https://example.com/v1beta/openai");
  });
});
