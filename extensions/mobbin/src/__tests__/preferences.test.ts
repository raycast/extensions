import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPreferenceValues: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: mocks.getPreferenceValues,
}));

import { getPreferences, hasApiKey } from "../lib/preferences";

describe("preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves valid stored REST preferences", () => {
    mocks.getPreferenceValues.mockReturnValue({
      authMode: "api-key",
      apiKey: " mobbin_secret ",
      defaultPlatform: "web",
      defaultSearchMode: "standard",
      defaultImageQuality: "high",
      defaultMcpImageFormat: "jpg",
      defaultLimit: "100",
    });
    const preferences = getPreferences();
    expect(preferences).toMatchObject({
      authMode: "api-key",
      defaultPlatform: "web",
      defaultSearchMode: "standard",
      defaultImageQuality: "high",
      defaultMcpImageFormat: "jpg",
      defaultLimit: "100",
    });
    expect(hasApiKey(preferences)).toBe(true);
  });

  it("uses safe new-install defaults for missing or corrupt values", () => {
    mocks.getPreferenceValues.mockReturnValue({
      authMode: "corrupt",
      apiKey: 42,
      defaultLimit: "1000",
    });
    expect(getPreferences()).toEqual({
      authMode: "oauth-mcp",
      defaultPlatform: "ios",
      defaultSearchMode: "deep",
      defaultImageQuality: "optimized",
      defaultMcpImageFormat: "webp",
      defaultLimit: "20",
    });
  });
});
