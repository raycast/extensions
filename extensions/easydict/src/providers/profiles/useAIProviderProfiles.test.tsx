// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AI_PROVIDER_STORAGE_KEY, fallbackAIProviderToPromptJSON } from "./repository";
import type { StoredAIProviderState } from "./types";
import { useAIProviderProfiles } from "./useAIProviderProfiles";

const host = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  getItem: vi.fn<(key: string) => Promise<string | undefined>>(),
}));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: host.getItem,
    setItem: async (key: string, value: string) => {
      host.storage.set(key, value);
    },
  },
  LaunchType: { Background: "background" },
  environment: { launchType: "userInitiated", commandMode: "view", isDevelopment: false },
  getPreferenceValues: () => ({
    enableOpenAITranslate: false,
    openAIAPIURL: "https://api.openai.com/v1",
    openAIModel: "model",
    enableGeminiTranslate: false,
    geminiAPIURL: "https://example.com/v1",
    geminiModel: "model",
  }),
}));

const state: StoredAIProviderState = {
  version: 2,
  migratedLegacyProviders: ["openai", "gemini"],
  profiles: [
    {
      id: "provider",
      name: "Provider",
      adapter: "openai-compatible",
      enabled: true,
      order: 0,
      icon: { kind: "initials" },
      wordResultMode: "dictionary",
      endpoint: "https://example.com/v1",
      apiKey: "",
      model: "model",
      tokenLimitMode: "max-tokens",
      jsonOutputMode: "json-object",
    },
  ],
};

beforeEach(() => {
  host.storage.clear();
  host.storage.set(AI_PROVIDER_STORAGE_KEY, JSON.stringify(state));
  host.getItem.mockReset().mockImplementation(async (key) => host.storage.get(key));
});
afterEach(cleanup);

describe("AI provider profile refresh", () => {
  it("keeps loaded profiles available while refreshing a persisted native JSON fallback", async () => {
    const { result } = renderHook(() => useAIProviderProfiles());
    expect(result.current.state.kind).toBe("loading");
    expect(result.current.storedState).toBeUndefined();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const previous = result.current;
    expect(previous.profiles).toEqual(state.profiles);

    await fallbackAIProviderToPromptJSON("provider");
    const read = deferredRead();
    host.getItem.mockReturnValueOnce(read.promise);
    let refresh!: ReturnType<typeof result.current.revalidate>;
    act(() => {
      refresh = result.current.revalidate();
    });
    const refreshing = result.current;
    await act(async () => {
      read.resolve(host.storage.get(AI_PROVIDER_STORAGE_KEY));
      await refresh;
    });

    expect(refreshing.isLoading).toBe(true);
    expect(refreshing.state.kind).toBe("ready");
    expect(refreshing.profiles).toBe(previous.profiles);
    expect(refreshing.storedState).toBe(previous.storedState);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.profiles).toEqual([{ ...state.profiles[0], jsonOutputMode: "prompt" }]);
  });

  it("replaces retained data with the completed refresh error instead of hiding invalid storage", async () => {
    const { result } = renderHook(() => useAIProviderProfiles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const previous = result.current;
    const read = deferredRead();
    host.getItem.mockReturnValueOnce(read.promise);
    let refresh!: ReturnType<typeof result.current.revalidate>;
    act(() => {
      refresh = result.current.revalidate();
    });
    const refreshing = result.current;
    await act(async () => {
      read.resolve("invalid JSON");
      await refresh;
    });

    expect(refreshing.storedState).toBe(previous.storedState);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.state.kind).toBe("invalid");
    expect(result.current.storedState).toBeUndefined();
  });
});

function deferredRead() {
  let resolve!: (value: string | undefined) => void;
  const promise = new Promise<string | undefined>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
