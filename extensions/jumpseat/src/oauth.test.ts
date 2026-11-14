import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearCache: vi.fn(),
  migrateCache: vi.fn(),
  authorizationRequest: vi.fn(),
  authorize: vi.fn(),
  getTokens: vi.fn(),
  removeTokens: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
  setTokens: vi.fn(),
  getConfiguration: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: mocks.getItem,
    removeItem: mocks.removeItem,
    setItem: mocks.setItem,
  },
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {
      authorizationRequest = mocks.authorizationRequest;
      authorize = mocks.authorize;
      getTokens = mocks.getTokens;
      removeTokens = mocks.removeTokens;
      setTokens = mocks.setTokens;
    },
  },
}));

vi.mock("./flight-cache", () => ({
  clearFlightCache: mocks.clearCache,
  migrateFlightCache: mocks.migrateCache,
}));

vi.mock("./config", () => ({
  getJumpseatConfiguration: mocks.getConfiguration,
}));

import {
  clearJumpseatAuthorization,
  getJumpseatAccessToken,
  refreshJumpseatAccessToken,
} from "./oauth";

describe("fresh authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getTokens.mockResolvedValue(undefined);
    mocks.setTokens.mockResolvedValue(undefined);
    mocks.setItem.mockResolvedValue(undefined);
    mocks.removeItem.mockResolvedValue(undefined);
    mocks.authorizationRequest.mockResolvedValue({
      redirectURI: "https://raycast.com/callback",
      codeVerifier: "verifier",
    });
    mocks.authorize.mockResolvedValue({ authorizationCode: "code" });
    mocks.getConfiguration.mockReturnValue({
      apiBaseUrl: "https://api.withjumpseat.com",
      webBaseUrl: "https://app.withjumpseat.com",
      authBaseUrl: "https://auth.withjumpseat.com",
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses the released login flow after discovery returns 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access",
          refresh_token: "refresh",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "flights:upcoming:read",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getJumpseatAccessToken()).resolves.toBe("access");
    expect(mocks.authorizationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://app.withjumpseat.com/connect/raycast",
      }),
    );
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://api.withjumpseat.com/api/v1/auth/oauth/token",
    );
    expect(mocks.setItem).toHaveBeenCalledWith(
      "jumpseat-auth-protocol",
      "legacy",
    );
  });

  it.each([
    [
      "server error",
      () => Promise.resolve(new Response(null, { status: 503 })),
    ],
    ["malformed document", () => Promise.resolve(new Response("not JSON"))],
    [
      "incorrect issuer",
      () => Promise.resolve(Response.json({ issuer: "https://other.example" })),
    ],
    ["network error", () => Promise.reject(new TypeError("offline"))],
  ])(
    "asks the user to retry after a discovery %s",
    async (_reason, discovery) => {
      const fetchMock = vi.fn().mockImplementation(discovery);
      vi.stubGlobal("fetch", fetchMock);

      await expect(getJumpseatAccessToken()).rejects.toThrow(
        "Please try again shortly.",
      );
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(mocks.authorizationRequest).not.toHaveBeenCalled();
      expect(mocks.setTokens).not.toHaveBeenCalled();
    },
  );

  it("accepts a central token response without scope", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          issuer: "https://auth.withjumpseat.com",
          authorization_endpoint:
            "https://auth.withjumpseat.com/oauth/authorize",
          token_endpoint: "https://auth.withjumpseat.com/oauth/token",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          access_token: "central-access",
          refresh_token: "central-refresh",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getJumpseatAccessToken()).resolves.toBe("central-access");
    expect(mocks.authorizationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://auth.withjumpseat.com/oauth/authorize",
      }),
    );
    expect(mocks.setTokens).toHaveBeenCalledWith({
      access_token: "central-access",
      refresh_token: "central-refresh",
      expires_in: 3600,
      scope: "flights:upcoming:read",
    });
    expect(mocks.setItem).toHaveBeenCalledWith(
      "jumpseat-auth-protocol",
      "central",
    );
  });
});

describe("clearJumpseatAuthorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTokens.mockResolvedValue(undefined);
    mocks.getItem.mockResolvedValue(undefined);
    mocks.removeTokens.mockResolvedValue(undefined);
    mocks.removeItem.mockResolvedValue(undefined);
    mocks.setItem.mockResolvedValue(undefined);
    mocks.setTokens.mockResolvedValue(undefined);
    mocks.getConfiguration.mockReturnValue({
      apiBaseUrl: "https://api.withjumpseat.com",
      webBaseUrl: "https://app.withjumpseat.com",
      authBaseUrl: "https://auth.withjumpseat.com",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes local credentials even when revocation metadata cannot be read", async () => {
    mocks.getItem.mockRejectedValue(new Error("storage read failed"));

    await expect(clearJumpseatAuthorization()).resolves.toBeUndefined();

    expect(mocks.removeTokens).toHaveBeenCalledOnce();
    expect(mocks.removeItem).toHaveBeenCalledTimes(4);
    expect(mocks.removeItem).toHaveBeenCalledWith("jumpseat-client-install-id");
  });

  it("reports a local token deletion failure after starting every cleanup", async () => {
    mocks.removeTokens.mockRejectedValue(new Error("token deletion failed"));

    await expect(clearJumpseatAuthorization()).rejects.toThrow(
      "token deletion failed",
    );

    expect(mocks.removeItem).toHaveBeenCalledTimes(4);
  });

  it("refreshes a central grant at its persisted trusted issuer", async () => {
    mocks.getTokens.mockResolvedValue({ refreshToken: "persisted-refresh" });
    mocks.getItem.mockImplementation((key: string) => {
      const values: Record<string, string | undefined> = {
        "jumpseat-auth-configuration": "https://api.withjumpseat.com",
        "jumpseat-auth-protocol": "central",
        "jumpseat-auth-issuer": "https://auth.withjumpseat.com",
      };
      return Promise.resolve(values[key]);
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "refreshed-access",
          refresh_token: "refreshed-refresh",
          token_type: "Bearer",
          expires_in: 3600,
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      refreshJumpseatAccessToken({
        apiBaseUrl: "https://api.withjumpseat.com",
        webBaseUrl: "https://app.withjumpseat.com",
        authBaseUrl: "https://auth-next.withjumpseat.com",
      }),
    ).resolves.toBe("refreshed-access");

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://auth.withjumpseat.com/oauth/token"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("best-effort revokes a central grant at its persisted trusted issuer", async () => {
    mocks.getConfiguration.mockReturnValue({
      apiBaseUrl: "https://api.withjumpseat.com",
      webBaseUrl: "https://app.withjumpseat.com",
      authBaseUrl: "https://auth-next.withjumpseat.com",
    });
    mocks.getTokens.mockResolvedValue({ refreshToken: "persisted-refresh" });
    mocks.getItem.mockImplementation((key: string) => {
      const values: Record<string, string | undefined> = {
        "jumpseat-auth-configuration": "https://api.withjumpseat.com",
        "jumpseat-auth-protocol": "central",
        "jumpseat-auth-issuer": "https://auth.withjumpseat.com",
      };
      return Promise.resolve(values[key]);
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(clearJumpseatAuthorization()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://auth.withjumpseat.com/oauth/revoke"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(mocks.removeTokens).toHaveBeenCalledOnce();
  });
});

describe.each(["central", "legacy"])("%s refresh failures", (protocol) => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getConfiguration.mockReturnValue({
      apiBaseUrl: "https://api.withjumpseat.com",
      webBaseUrl: "https://app.withjumpseat.com",
      authBaseUrl: "https://auth.withjumpseat.com",
    });
    mocks.getTokens.mockResolvedValue({ refreshToken: "stored-refresh" });
    mocks.getItem.mockImplementation(
      async (key: string) =>
        ({
          "jumpseat-auth-configuration":
            protocol === "legacy"
              ? "https://api.withjumpseat.com\nhttps://app.withjumpseat.com"
              : "https://api.withjumpseat.com",
          "jumpseat-auth-protocol": protocol,
          "jumpseat-auth-issuer":
            protocol === "central"
              ? "https://auth.withjumpseat.com"
              : undefined,
          "jumpseat-client-install-id": "test-install",
        })[key],
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [400, { error: "invalid_request" }],
    [403, { error: "forbidden" }],
    [429, { error: "rate_limited" }],
    [429, { error: "invalid_grant" }],
    [500, { error: "invalid_grant" }],
    [502, "Bad gateway"],
    [503, { error: "unavailable" }],
  ])("keeps credentials after HTTP %s", async (status, body) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
        }),
      ),
    );
    await expect(refreshJumpseatAccessToken()).rejects.toThrow();
    expect(mocks.removeTokens).not.toHaveBeenCalled();
    expect(mocks.removeItem).not.toHaveBeenCalled();
    expect(mocks.setTokens).not.toHaveBeenCalled();
    expect(mocks.clearCache).not.toHaveBeenCalled();
  });

  it("handles an unstructured 401 according to the issuing protocol", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );
    await expect(refreshJumpseatAccessToken()).rejects.toThrow(
      protocol === "legacy"
        ? "session has expired"
        : "Please try again shortly.",
    );
    expect(mocks.removeTokens).toHaveBeenCalledTimes(
      protocol === "legacy" ? 1 : 0,
    );
  });

  it("never displays server-provided refresh errors containing credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "invalid_client",
            message: "stored-refresh",
          }),
          { status: 400 },
        ),
      ),
    );
    await expect(refreshJumpseatAccessToken()).rejects.toThrow(
      "Please try again shortly.",
    );
    expect(mocks.removeTokens).not.toHaveBeenCalled();
  });

  it.each([
    [401, { error: "invalid_grant" }],
    [400, { error: "invalid_grant" }],
    [400, { code: "invalid_grant" }],
  ])("clears rejected credentials after HTTP %s", async (status, body) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
        }),
      ),
    );
    await expect(refreshJumpseatAccessToken()).rejects.toThrow();
    expect(mocks.removeTokens).toHaveBeenCalledOnce();
    expect(mocks.removeItem).toHaveBeenCalledTimes(4);
    expect(mocks.clearCache).toHaveBeenCalledOnce();
  });

  it.each([
    new TypeError("offline"),
    new DOMException("timeout", "TimeoutError"),
  ])("preserves credentials after a network failure", async (error) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(refreshJumpseatAccessToken()).rejects.toThrow(
      "Please try again shortly.",
    );
    expect(mocks.removeTokens).not.toHaveBeenCalled();
    expect(mocks.removeItem).not.toHaveBeenCalled();
  });

  it.each(["not JSON", JSON.stringify({ access_token: "incomplete" })])(
    "preserves credentials after a malformed successful response",
    async (body) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
      await expect(refreshJumpseatAccessToken()).rejects.toThrow(
        "Please try again shortly.",
      );
      expect(mocks.removeTokens).not.toHaveBeenCalled();
      expect(mocks.setTokens).not.toHaveBeenCalled();
    },
  );

  it("can retry a transient failure and persist rotated tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "rotated-access",
            refresh_token: "rotated-refresh",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(refreshJumpseatAccessToken()).rejects.toThrow();
    await expect(refreshJumpseatAccessToken()).resolves.toBe("rotated-access");
    expect(mocks.removeTokens).not.toHaveBeenCalled();
    expect(mocks.setTokens).toHaveBeenCalledWith({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
      expiresIn: 3600,
      scope: "flights:upcoming:read",
    });
  });
});
