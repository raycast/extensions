import { beforeEach, describe, expect, it, vi } from "vitest";

const localStorageState = new Map<string, string>();
let secureAccessToken: string | null = null;

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    async getItem<T extends string>(key: string): Promise<T | undefined> {
      return localStorageState.get(key) as T | undefined;
    },
    async setItem(key: string, value: string): Promise<void> {
      localStorageState.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      localStorageState.delete(key);
    },
  },
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {
      async setTokens(tokens: { accessToken: string }): Promise<void> {
        secureAccessToken = tokens.accessToken;
      }
      async getTokens(): Promise<{ accessToken: string } | undefined> {
        return secureAccessToken ? { accessToken: secureAccessToken } : undefined;
      }
      async removeTokens(): Promise<void> {
        secureAccessToken = null;
      }
    },
  },
}));

describe("api-key auth storage", () => {
  beforeEach(() => {
    localStorageState.clear();
    secureAccessToken = null;
    vi.clearAllMocks();
  });

  it("stores, reads, and clears generated API keys and metadata", async () => {
    const { clearGeneratedApiKey, getGeneratedApiKey, getGeneratedApiKeyMetadata, storeGeneratedApiKey } =
      await import("./api-key-auth");

    await storeGeneratedApiKey("nb_live_public_secret", {
      userId: "user-1",
      apiKeyId: "key-1",
      apiKeyPrefix: "nb_live_public",
      platform: "raycast",
    });

    expect(await getGeneratedApiKey()).toBe("nb_live_public_secret");
    expect(await getGeneratedApiKeyMetadata()).toEqual({
      userId: "user-1",
      apiKeyId: "key-1",
      apiKeyPrefix: "nb_live_public",
      platform: "raycast",
      createdAt: expect.any(String),
    });

    await clearGeneratedApiKey();
    expect(await getGeneratedApiKey()).toBeNull();
    expect(await getGeneratedApiKeyMetadata()).toBeNull();
  });
});
