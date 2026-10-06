const localItems = new Map<string, string>();
export const raycastLocalStorageMock = {
  getItem: (key: string) => Promise.resolve(localItems.get(key)),
  setItem: (key: string, value: string) => {
    localItems.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    localItems.delete(key);
    return Promise.resolve();
  },
  allItems: () => Promise.resolve(Object.fromEntries(localItems)),
};
interface RaycastApiMockOverrides {
  getPreferenceValues?: () => unknown;
  oauthClient?: new (...args: unknown[]) => unknown;
}

export const createRaycastApiMock = (
  isDevelopment: boolean,
  overrides: RaycastApiMockOverrides = {},
) => ({
  environment: { isDevelopment },
  LocalStorage: raycastLocalStorageMock,
  getPreferenceValues: overrides.getPreferenceValues ?? (() => ({})),
  OAuth: {
    PKCEClient: overrides.oauthClient ?? class {},
    RedirectMethod: { App: "app", AppURI: "appURI", Web: "web" },
  },
});
