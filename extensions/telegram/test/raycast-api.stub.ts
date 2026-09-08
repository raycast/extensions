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
