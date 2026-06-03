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

export const environment = {
  supportPath: "/tmp/vocabuilder-test-support",
};

// colors.ts reads Color.Blue etc. at module load — Proxy keeps that working
// without enumerating every Raycast color name.
export const Color = new Proxy(
  {},
  {
    get: (_target, prop) => String(prop),
  },
) as Record<string, string>;

export const Toast = {
  Style: { Animated: "animated", Failure: "failure", Success: "success" },
};

export const showToast = vi.fn(async () => ({ hide: vi.fn(async () => {}) }));

// Placeholders: imported by .tsx files but only accessed inside render/handler
// bodies, which tests never invoke. Exist so the import statement resolves.
export const Action = {} as never;
export const ActionPanel = {} as never;
export const List = {} as never;
export const Detail = {} as never;
export const Icon = {} as never;
export const Keyboard = {} as never;
export const closeMainWindow = vi.fn(async () => {});
export const openExtensionPreferences = vi.fn(async () => {});
export const useNavigation = () => ({ push: vi.fn(), pop: vi.fn() });
