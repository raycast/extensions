/**
 * Stand-in for `@raycast/api` under test.
 *
 * The published package ships types only -- Raycast injects the implementation at
 * runtime -- so it has no entry point for a test runner to resolve. vitest.config.ts
 * aliases the import here so modules that touch the API can be unit tested.
 */
export const environment = {
  supportPath: "/tmp/raycast-telegram-test",
};

export const LocalStorage = {
  getItem: async () => undefined,
  setItem: async () => {},
  removeItem: async () => {},
};

let preferencesMock: Record<string, unknown> = {};

export function __setPreferencesMock(prefs: Record<string, unknown>) {
  preferencesMock = prefs;
}

export function getPreferenceValues<T = Record<string, unknown>>(): T {
  return preferencesMock as T;
}

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const showToast = async (options?: { style?: string; title?: string; message?: string }) => ({
  style: options?.style || "",
  title: options?.title || "",
  message: options?.message || "",
});
