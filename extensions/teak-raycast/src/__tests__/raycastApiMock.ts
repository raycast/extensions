interface RaycastApiMockOverrides {
  getPreferenceValues?: () => unknown;
  oauthClient?: new (...args: unknown[]) => unknown;
}

export const createRaycastApiMock = (
  isDevelopment: boolean,
  overrides: RaycastApiMockOverrides = {},
) => ({
  environment: { isDevelopment },
  getPreferenceValues: overrides.getPreferenceValues ?? (() => ({})),
  OAuth: {
    PKCEClient: overrides.oauthClient ?? class {},
    RedirectMethod: { App: "app", AppURI: "appURI", Web: "web" },
  },
});
