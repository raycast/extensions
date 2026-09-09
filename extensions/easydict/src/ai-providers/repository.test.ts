import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI_PROVIDER_STORAGE_KEY,
  fallbackAIProviderToPromptJSON,
  isStoredAIProviderStateV1,
  loadAIProviderState,
  saveAIProviderState,
} from "./repository";
import type { StoredAIProviderState } from "./types";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key))),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
  },
}));
vi.mock("@/utils/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: vi.fn() }),
}));

beforeEach(() => {
  storage.clear();
});

describe("AI provider repository", () => {
  it("distinguishes missing storage from a ready empty state", async () => {
    const result = await loadAIProviderState();
    expect(result).toEqual({ kind: "missing", state: { version: 2, migratedLegacyProviders: [], profiles: [] } });
  });

  it("round-trips a valid versioned state", async () => {
    const state: StoredAIProviderState = {
      version: 2,
      migratedLegacyProviders: [],
      providerOrder: ["builtin:dictionary:Youdao Dictionary", "ai:profile-1"],

      profiles: [
        {
          id: "profile-1",
          adapter: "openai-compatible",
          name: "Example",
          enabled: true,
          order: 0,
          icon: { kind: "preset", name: "mimo" },
          wordResultMode: "dictionary",
          endpoint: "https://example.com/v1",
          model: "example-model",
          apiKey: "test-placeholder",
          tokenLimitMode: "max-tokens",
          jsonOutputMode: "json-object",
        },
      ],
    };

    await saveAIProviderState(state);
    expect(await loadAIProviderState()).toEqual({ kind: "ready", state });
  });

  it("updates only the requested provider JSON output mode", async () => {
    const state: StoredAIProviderState = {
      version: 2,
      migratedLegacyProviders: [],
      profiles: [
        {
          id: "profile-1",
          adapter: "openai-compatible",
          name: "Example",
          enabled: true,
          order: 0,
          icon: { kind: "initials" },
          wordResultMode: "dictionary",
          endpoint: "https://example.com/v1",
          model: "example-model",
          apiKey: "test-placeholder",
          tokenLimitMode: "max-tokens",
          jsonOutputMode: "json-object",
        },
      ],
    };
    await saveAIProviderState(state);

    expect(await fallbackAIProviderToPromptJSON("profile-1")).toBe(true);
    expect(await fallbackAIProviderToPromptJSON("profile-1")).toBe(true);
    expect(await fallbackAIProviderToPromptJSON("missing")).toBe(false);
    expect(await loadAIProviderState()).toEqual({
      kind: "ready",
      state: { ...state, profiles: [{ ...state.profiles[0], jsonOutputMode: "prompt" }] },
    });
  });

  it("rejects duplicate or empty saved provider keys", async () => {
    const profile = {
      id: "profile-1",
      adapter: "openai-compatible" as const,
      name: "Example",
      enabled: true,
      order: 0,
      icon: { kind: "preset" as const, name: "mimo" as const },
      wordResultMode: "translation" as const,
      endpoint: "https://example.com/v1",
      model: "example-model",
      apiKey: "test-placeholder",
      tokenLimitMode: "max-tokens" as const,
      jsonOutputMode: "prompt" as const,
    };

    await expect(
      saveAIProviderState({
        version: 2,
        migratedLegacyProviders: [],
        profiles: [profile],
        providerOrder: ["ai:profile-1", "ai:profile-1"],
      }),
    ).rejects.toThrow("invalid");
    await expect(
      saveAIProviderState({ version: 2, migratedLegacyProviders: [], profiles: [profile], providerOrder: [] }),
    ).rejects.toThrow("invalid");
    await expect(
      saveAIProviderState({ version: 2, migratedLegacyProviders: [], profiles: [profile], providerOrder: [""] }),
    ).rejects.toThrow("invalid");
  });

  it("validates old assignments before migration, accepting deleted profiles but rejecting duplicate assignments", () => {
    expect(
      isStoredAIProviderStateV1({
        version: 1,
        profiles: [],
        legacyProviderAssignments: { openai: { kind: "profile", profileId: "missing" } },
      }),
    ).toBe(true);
    expect(
      isStoredAIProviderStateV1({
        version: 1,
        profiles: [],
        legacyProviderAssignments: {
          openai: { kind: "profile", profileId: "same" },
          gemini: { kind: "profile", profileId: "same" },
        },
      }),
    ).toBe(false);
  });

  it("validates temporary v2 legacy assignments", async () => {
    const valid = JSON.stringify({
      version: 2,
      profiles: [],
      migratedLegacyProviders: ["openai"],
      legacyProviderAssignments: { openai: { kind: "profile", profileId: "deleted" } },
    });
    storage.set(AI_PROVIDER_STORAGE_KEY, valid);
    expect(await loadAIProviderState()).toMatchObject({ kind: "ready" });

    for (const legacyProviderAssignments of [
      { unknown: { kind: "retired" } },
      { openai: { kind: "profile", profileId: "" } },
      { openai: { kind: "profile", profileId: "same" }, gemini: { kind: "profile", profileId: "same" } },
    ]) {
      const raw = JSON.stringify({
        version: 2,
        profiles: [],
        migratedLegacyProviders: ["openai"],
        legacyProviderAssignments,
      });
      storage.set(AI_PROVIDER_STORAGE_KEY, raw);
      expect(await loadAIProviderState()).toMatchObject({ kind: "invalid", rawValue: raw });
    }

    const pendingSourceMapping = JSON.stringify({
      version: 2,
      profiles: [],
      migratedLegacyProviders: [],
      legacyProviderAssignments: { openai: { kind: "retired" } },
    });
    storage.set(AI_PROVIDER_STORAGE_KEY, pendingSourceMapping);
    expect(await loadAIProviderState()).toMatchObject({ kind: "invalid", rawValue: pendingSourceMapping });
  });

  it("rejects malformed migration records without overwriting stored data", async () => {
    const raw = JSON.stringify({ version: 2, profiles: [], migratedLegacyProviders: ["openai", "unknown"] });
    storage.set(AI_PROVIDER_STORAGE_KEY, raw);
    expect(await loadAIProviderState()).toMatchObject({ kind: "invalid", rawValue: raw });
    expect(storage.get(AI_PROVIDER_STORAGE_KEY)).toBe(raw);
    await expect(
      saveAIProviderState({ version: 2, profiles: [], migratedLegacyProviders: ["openai", "openai"] }),
    ).rejects.toThrow("invalid");
  });

  it("preserves malformed and unsupported raw values for recovery", async () => {
    storage.set(AI_PROVIDER_STORAGE_KEY, "{broken");
    const invalidJSON = await loadAIProviderState();
    expect(invalidJSON).toMatchObject({ kind: "invalid", rawValue: "{broken" });

    storage.set(AI_PROVIDER_STORAGE_KEY, JSON.stringify({ version: 99, profiles: [] }));
    const unsupported = await loadAIProviderState();
    expect(unsupported).toMatchObject({ kind: "unsupported", version: 99 });

    storage.set(
      AI_PROVIDER_STORAGE_KEY,
      JSON.stringify({ version: 2, migratedLegacyProviders: [], profiles: [{ id: "incomplete" }] }),
    );
    const invalidShape = await loadAIProviderState();
    expect(invalidShape).toMatchObject({ kind: "invalid" });
  });
});
