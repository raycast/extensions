import { beforeEach, describe, expect, it, vi } from "vitest";

import { AI_PROVIDER_STORAGE_KEY, loadAIProviderState, saveAIProviderState } from "./repository";
import type { StoredAIProviderStateV1 } from "./types";

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
    expect(result).toEqual({ kind: "missing", state: { version: 1, profiles: [] } });
  });

  it("round-trips a valid versioned state", async () => {
    const state: StoredAIProviderStateV1 = {
      version: 1,
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
      saveAIProviderState({ version: 1, profiles: [profile], providerOrder: ["ai:profile-1", "ai:profile-1"] }),
    ).rejects.toThrow("invalid");
    await expect(saveAIProviderState({ version: 1, profiles: [profile], providerOrder: [] })).rejects.toThrow(
      "invalid",
    );
    await expect(saveAIProviderState({ version: 1, profiles: [profile], providerOrder: [""] })).rejects.toThrow(
      "invalid",
    );
  });

  it("preserves malformed and unsupported raw values for recovery", async () => {
    storage.set(AI_PROVIDER_STORAGE_KEY, "{broken");
    const invalidJSON = await loadAIProviderState();
    expect(invalidJSON).toMatchObject({ kind: "invalid", rawValue: "{broken" });

    storage.set(AI_PROVIDER_STORAGE_KEY, JSON.stringify({ version: 2, profiles: [] }));
    const unsupported = await loadAIProviderState();
    expect(unsupported).toMatchObject({ kind: "unsupported", version: 2 });

    storage.set(AI_PROVIDER_STORAGE_KEY, JSON.stringify({ version: 1, profiles: [{ id: "incomplete" }] }));
    const invalidShape = await loadAIProviderState();
    expect(invalidShape).toMatchObject({ kind: "invalid" });
  });
});
