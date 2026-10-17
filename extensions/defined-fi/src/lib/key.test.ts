import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApiKey, saveApiKey } from "./key";

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  preferences: {} as { apiKey?: string },
}));
const store = state.store;

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => state.preferences,
  LocalStorage: {
    getItem: async (key: string) => state.store.get(key),
    setItem: async (key: string, value: string) => void state.store.set(key, value),
    removeItem: async (key: string) => void state.store.delete(key),
  },
}));

describe("getApiKey", () => {
  beforeEach(() => {
    store.clear();
    state.preferences = {};
  });

  it("returns undefined when no key is set", async () => {
    expect(await getApiKey()).toBeUndefined();
  });

  it("returns the saved key, trimmed on save", async () => {
    await saveApiKey("  saved-key \n");
    expect(await getApiKey()).toBe("saved-key");
  });

  it("prefers the preference over the saved key", async () => {
    await saveApiKey("saved-key");
    state.preferences = { apiKey: " pref-key " };
    expect(await getApiKey()).toBe("pref-key");
  });

  it("ignores a blank preference", async () => {
    await saveApiKey("saved-key");
    state.preferences = { apiKey: "   " };
    expect(await getApiKey()).toBe("saved-key");
  });
});
