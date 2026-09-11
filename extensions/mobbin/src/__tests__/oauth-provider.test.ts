import { beforeEach, describe, expect, it, vi } from "vitest";
import { RaycastMcpOAuthProvider } from "../lib/oauth-provider";

const raycastMock = vi.hoisted(() => ({
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@raycast/api", () => ({
  environment: {
    commandName: "test-command",
  },
  LocalStorage: raycastMock.localStorage,
  OAuth: {
    RedirectMethod: { Web: "web", App: "app", AppURI: "appURI" },
    PKCEClient: class {},
  },
}));

describe("RaycastMcpOAuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the Raycast https web callback for dynamic client registration", () => {
    const provider = new RaycastMcpOAuthProvider({} as never);

    expect(provider.redirectUrl).toBe(
      "https://raycast.com/redirect?packageName=Extension",
    );
    expect(provider.clientMetadata.redirect_uris).toEqual([
      "https://raycast.com/redirect?packageName=Extension",
    ]);
  });

  it("keeps cached clients whose redirect URIs include the web callback", async () => {
    raycastMock.localStorage.getItem.mockImplementation(async (key: string) => {
      if (key === "mobbin.oauth.clientSchemaVersion") return "2";
      if (key === "mobbin.oauth.clientInformation")
        return JSON.stringify({
          client_id: "current-client",
          redirect_uris: ["https://raycast.com/redirect?packageName=Extension"],
        });
      return undefined;
    });
    const provider = new RaycastMcpOAuthProvider({} as never);

    await expect(provider.clientInformation()).resolves.toMatchObject({
      client_id: "current-client",
    });
    expect(raycastMock.localStorage.removeItem).not.toHaveBeenCalledWith(
      "mobbin.oauth.clientInformation",
    );
  });

  it("discards cached clients without the web callback redirect URI", async () => {
    raycastMock.localStorage.getItem.mockImplementation(async (key: string) => {
      if (key === "mobbin.oauth.clientSchemaVersion") return "2";
      if (key === "mobbin.oauth.clientInformation")
        return JSON.stringify({
          client_id: "old-client",
          redirect_uris: ["com.raycast:/oauth?package_name=Extension"],
        });
      return undefined;
    });
    const provider = new RaycastMcpOAuthProvider({} as never);

    await expect(provider.clientInformation()).resolves.toBeUndefined();
    expect(raycastMock.localStorage.removeItem).toHaveBeenCalledWith(
      "mobbin.oauth.clientInformation",
    );
  });

  it("discards clients written under an older schema version", async () => {
    raycastMock.localStorage.getItem.mockImplementation(async (key: string) => {
      if (key === "mobbin.oauth.clientSchemaVersion") return undefined; // pre-migration
      if (key === "mobbin.oauth.clientInformation")
        return JSON.stringify({
          client_id: "legacy-client",
          redirect_uris: ["https://raycast.com/redirect?packageName=Extension"],
        });
      return undefined;
    });
    const provider = new RaycastMcpOAuthProvider({} as never);

    await expect(provider.clientInformation()).resolves.toBeUndefined();
    expect(raycastMock.localStorage.removeItem).toHaveBeenCalledWith(
      "mobbin.oauth.clientInformation",
    );
    expect(raycastMock.localStorage.setItem).toHaveBeenCalledWith(
      "mobbin.oauth.clientSchemaVersion",
      "2",
    );
  });

  it("starts authorization with Raycast's tracked request object", async () => {
    const authorizationRequest = {
      codeChallenge: "raycast-code-challenge",
      codeVerifier: "v".repeat(64),
      redirectURI: "https://raycast.com/redirect?packageName=mobbin",
      state: "raycast-state",
      toURL: () => "https://auth.example.com/oauth/authorize",
    };
    const oauthClient = {
      authorizationRequest: vi.fn(async () => authorizationRequest),
      authorize: vi.fn(async () => ({
        authorizationCode: "authorization-code",
      })),
    };
    const provider = new RaycastMcpOAuthProvider(oauthClient as never);
    const authorizationUrl = new URL(
      "https://auth.example.com/oauth/authorize",
    );
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", "registered-client");
    authorizationUrl.searchParams.set("code_challenge", "sdk-code-challenge");
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set(
      "redirect_uri",
      "https://raycast.com/redirect?packageName=mobbin",
    );
    authorizationUrl.searchParams.set("scope", "openid");
    authorizationUrl.searchParams.set("resource", "https://api.mobbin.com/mcp");

    await provider.redirectToAuthorization(authorizationUrl);

    expect(oauthClient.authorizationRequest).toHaveBeenCalledWith({
      endpoint: "https://auth.example.com/oauth/authorize",
      clientId: "registered-client",
      scope: "openid",
      extraParameters: {
        resource: "https://api.mobbin.com/mcp",
      },
    });
    expect(raycastMock.localStorage.setItem).toHaveBeenCalledWith(
      "mobbin.oauth.codeVerifier",
      "v".repeat(64),
    );
    expect(oauthClient.authorize).toHaveBeenCalledWith(authorizationRequest);
    expect(provider.redirectUrl).toBe(
      "https://raycast.com/redirect?packageName=mobbin",
    );
    expect(provider.takeAuthorizationCode()).toBe("authorization-code");
  });

  it("rejects corrupt persisted OAuth structures", async () => {
    raycastMock.localStorage.getItem.mockImplementation(async (key: string) => {
      if (key === "mobbin.oauth.clientSchemaVersion") return "2";
      if (key === "mobbin.oauth.clientInformation")
        return JSON.stringify({ client_id: 42 });
      if (key === "mobbin.oauth.discoveryState")
        return JSON.stringify({
          authorizationServerUrl: "javascript:alert(1)",
        });
      if (key === "mobbin.oauth.codeVerifier") return "short";
      return undefined;
    });
    const provider = new RaycastMcpOAuthProvider({} as never);
    await expect(provider.clientInformation()).resolves.toBeUndefined();
    await expect(provider.discoveryState()).resolves.toBeUndefined();
    await expect(provider.codeVerifier()).rejects.toThrow("Missing or invalid");
  });

  it("bridges Raycast token storage for initial and refreshed tokens", async () => {
    const setTokens = vi.fn();
    const oauthClient = {
      getTokens: vi.fn(async () => ({
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: 3600,
        updatedAt: new Date(),
        isExpired: () => false,
        scope: "openid",
      })),
      setTokens,
    };
    const provider = new RaycastMcpOAuthProvider(oauthClient as never);
    await expect(provider.tokens()).resolves.toEqual({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid",
    });
    await provider.saveTokens({
      access_token: "refreshed",
      refresh_token: "new-refresh",
      token_type: "Bearer",
      expires_in: 7200,
      scope: "openid",
    });
    expect(setTokens).toHaveBeenCalledWith({
      access_token: "refreshed",
      refresh_token: "new-refresh",
      expires_in: 7200,
      scope: "openid",
    });
  });
});
