interface RaycastApiMockOverrides {
  getPreferenceValues?: () => unknown;
}

export const createRaycastApiMock = (
  isDevelopment: boolean,
  overrides: RaycastApiMockOverrides = {},
) => ({
  environment: { isDevelopment },
  getPreferenceValues: overrides.getPreferenceValues ?? (() => ({})),
  OAuth: {
    PKCEClient: class {},
    RedirectMethod: { App: "app", AppURI: "appURI", Web: "web" },
  },
});
