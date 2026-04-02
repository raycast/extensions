import { vi } from "vitest";

const store = new Map<string, string>();

export const LocalStorage = {
  getItem: vi.fn(async (key: string) => store.get(key) ?? undefined),
  setItem: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(async () => {
    store.clear();
  }),
  _store: store,
};

export const getPreferenceValues = vi.fn(() => ({
  geminiApiKey: "test-api-key",
  sourceLanguage: "en",
  targetLanguage: "uk",
}));

export const closeMainWindow = vi.fn(async () => {});
