import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authorize as authorizeKato } from "../src/oauth";
import { KATO_OAUTH_SCOPE } from "../src/oauth-config";

const mocks = vi.hoisted(() => ({
  getTokens: vi.fn(),
  removeTokens: vi.fn(),
  setTokens: vi.fn(),
  authorizationRequest: vi.fn(),
  authorize: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {
      getTokens = mocks.getTokens;
      removeTokens = mocks.removeTokens;
      setTokens = mocks.setTokens;
      authorizationRequest = mocks.authorizationRequest;
      authorize = mocks.authorize;
    },
  },
}));

const refreshed = { access_token: "new-access", refresh_token: "new-refresh" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.getTokens.mockResolvedValue({
    accessToken: "expired-access",
    refreshToken: "saved-refresh",
    scope: KATO_OAUTH_SCOPE,
    isExpired: () => true,
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("OAuth refresh failures", () => {
  it("preserves credentials while offline and can refresh on retry", async () => {
    const error = new TypeError("Network request failed");
    mocks.fetch.mockRejectedValueOnce(error);
    await expect(authorizeKato()).rejects.toBe(error);
    expect(mocks.removeTokens).not.toHaveBeenCalled();
    expect(mocks.authorizationRequest).not.toHaveBeenCalled();

    mocks.fetch.mockResolvedValueOnce(Response.json(refreshed));
    await expect(authorizeKato()).resolves.toBe("new-access");
    expect(mocks.setTokens).toHaveBeenCalledWith(refreshed);
    expect(mocks.fetch.mock.calls[1][1].body.get("refresh_token")).toBe(
      "saved-refresh",
    );
  });

  it.each([
    [503, "temporarily_unavailable"],
    [503, "invalid_grant"],
    [429, "invalid_grant"],
    [400, "invalid_request"],
    [401, "invalid_client"],
  ])("preserves credentials for HTTP %i / %s", async (status, error) => {
    mocks.fetch.mockResolvedValue(Response.json({ error }, { status }));
    await expect(authorizeKato()).rejects.toThrow(error);
    expect(mocks.removeTokens).not.toHaveBeenCalled();
    expect(mocks.authorizationRequest).not.toHaveBeenCalled();
    expect(mocks.setTokens).not.toHaveBeenCalled();
  });

  it.each([200, 400, 503])(
    "preserves credentials for malformed HTTP %i responses",
    async (status) => {
      mocks.fetch.mockResolvedValue(new Response("not json", { status }));
      await expect(authorizeKato()).rejects.toThrow(
        "Kato did not return an access token",
      );
      expect(mocks.removeTokens).not.toHaveBeenCalled();
      expect(mocks.authorizationRequest).not.toHaveBeenCalled();
    },
  );

  it("preserves credentials when saving refreshed tokens fails", async () => {
    mocks.fetch.mockResolvedValue(Response.json(refreshed));
    const error = new Error("Token storage unavailable");
    mocks.setTokens.mockRejectedValue(error);
    await expect(authorizeKato()).rejects.toBe(error);
    expect(mocks.removeTokens).not.toHaveBeenCalled();
    expect(mocks.authorizationRequest).not.toHaveBeenCalled();
  });

  it("clears an explicitly rejected refresh token and signs in again", async () => {
    mocks.fetch
      .mockResolvedValueOnce(
        Response.json({ error: "invalid_grant" }, { status: 400 }),
      )
      .mockResolvedValueOnce(Response.json(refreshed));
    mocks.authorizationRequest.mockResolvedValue({
      codeVerifier: "verifier",
      redirectURI: "https://raycast.com/redirect",
    });
    mocks.authorize.mockResolvedValue({ authorizationCode: "code" });
    await expect(authorizeKato()).resolves.toBe("new-access");
    expect(mocks.removeTokens).toHaveBeenCalledOnce();
    expect(mocks.authorizationRequest).toHaveBeenCalledOnce();
    expect(mocks.authorize).toHaveBeenCalledOnce();
    expect(mocks.setTokens).toHaveBeenCalledWith(refreshed);
    expect(mocks.fetch.mock.calls[1][1].body.get("grant_type")).toBe(
      "authorization_code",
    );
  });
});
