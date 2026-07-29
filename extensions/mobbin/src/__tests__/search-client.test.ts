import { describe, expect, it, vi } from "vitest";
import { createSearchClient } from "../lib/search-client";
import { MobbinMcpClient } from "../lib/mcp-client";
import { MobbinRestClient } from "../lib/rest-client";

vi.mock("@raycast/api", () => ({
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {},
  },
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("../lib/preferences", () => ({
  getPreferences: vi.fn(() => ({
    authMode: "api-key",
    apiKey: "secret",
    defaultPlatform: "ios",
    defaultSearchMode: "deep",
    defaultImageQuality: "optimized",
    defaultMcpImageFormat: "webp",
    defaultLimit: "20",
  })),
}));

describe("createSearchClient", () => {
  it("creates REST clients for API key mode", () => {
    expect(createSearchClient()).toBeInstanceOf(MobbinRestClient);
  });

  it("creates MCP clients for OAuth MCP mode", async () => {
    const preferences = await import("../lib/preferences");
    vi.mocked(preferences.getPreferences).mockReturnValueOnce({
      authMode: "oauth-mcp",
      defaultPlatform: "ios",
      defaultSearchMode: "deep",
      defaultImageQuality: "optimized",
      defaultMcpImageFormat: "webp",
      defaultLimit: "20",
    });

    expect(createSearchClient()).toBeInstanceOf(MobbinMcpClient);
  });
});
