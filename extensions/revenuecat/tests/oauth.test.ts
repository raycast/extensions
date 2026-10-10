import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_ID,
  REDIRECT_URI,
  createTokenReader,
  exchangeToken,
  OAuthTokenError,
  hasRequiredScopes,
  SCOPES,
  type TokenResponse,
} from "../src/lib/oauth-core.ts";
const response: TokenResponse = {
  access_token: "atk_test",
  refresh_token: "rtk_rotated",
  token_type: "Bearer",
  expires_in: 3600,
};

test("scope upgrades recognize RevenueCat wildcard grants without accepting missing permissions", () => {
  assert.equal(hasRequiredScopes(SCOPES.join(" ")), true);
  assert.equal(hasRequiredScopes("*:*:read"), true);
  assert.equal(hasRequiredScopes(undefined), false);
  assert.equal(hasRequiredScopes(SCOPES.filter((scope) => scope !== "charts_metrics:charts:read").join(" ")), false);
  assert.equal(hasRequiredScopes("*:*:read", ["customer_information:customers:read_write"]), false);
});

test("refresh preserves granted scopes when the provider omits them", async () => {
  let saved: TokenResponse | undefined;
  const get = createTokenReader(
    {
      async getTokens() {
        return { accessToken: "old", refreshToken: "refresh", scope: "*:*:read", isExpired: () => true };
      },
      async setTokens(tokens) {
        saved = tokens;
      },
      async removeTokens() {
        assert.fail("valid connection should remain");
      },
    },
    async () => ({ ...response }),
  );
  await get();
  assert.equal(saved?.scope, "*:*:read");
});

test("public-client token exchange sends PKCE and the registered callback without a secret or browser Origin", async () => {
  const result = await exchangeToken(
    { grant_type: "authorization_code", code: "test-code", code_verifier: "test-verifier", redirect_uri: REDIRECT_URI },
    (async (url, init) => {
      assert.equal(url, "https://api.revenuecat.com/oauth2/token");
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      const body = new URLSearchParams(init?.body as URLSearchParams);
      assert.equal(body.get("client_id"), CLIENT_ID);
      assert.equal(body.get("redirect_uri"), "https://raycast.com/redirect?packageName=RevenueCat");
      assert.equal(body.get("code_verifier"), "test-verifier");
      assert.equal(body.has("client_secret"), false);
      assert.equal(new Headers(init?.headers).has("Origin"), false);
      assert.equal(new Headers(init?.headers).has("Authorization"), false);
      return Response.json(response);
    }) as typeof fetch,
  );
  assert.deepEqual(result, response);
});

test("token errors and malformed responses never expose provider secrets", async () => {
  const request = (async () =>
    Response.json({ error: "invalid_grant", error_description: "secret-code" }, { status: 400 })) as typeof fetch;
  await assert.rejects(
    exchangeToken({}, request),
    (error: unknown) =>
      error instanceof OAuthTokenError && error.code === "invalid_grant" && !error.message.includes("secret-code"),
  );
  await assert.rejects(
    exchangeToken({}, (async () => Response.json({ ...response, refresh_token: undefined })) as typeof fetch),
    /invalid OAuth token response/,
  );
});

test("simultaneous API requests share a refresh and store both rotated tokens before returning", async () => {
  let refreshes = 0;
  let saved: TokenResponse | undefined;
  const get = createTokenReader(
    {
      async getTokens() {
        return saved
          ? { accessToken: saved.access_token, refreshToken: saved.refresh_token, isExpired: () => false }
          : { accessToken: "old", refreshToken: "old-refresh", isExpired: () => true };
      },
      async setTokens(tokens) {
        saved = tokens;
      },
      async removeTokens() {
        assert.fail("should not remove valid tokens");
      },
    },
    async (params) => {
      refreshes++;
      assert.equal(params.refresh_token, "old-refresh");
      return response;
    },
  );
  assert.deepEqual(await Promise.all([get(), get(), get()]), ["atk_test", "atk_test", "atk_test"]);
  assert.deepEqual(saved, response);
  assert.equal(await get(), "atk_test");
  assert.equal(refreshes, 1);
});

test("revoked refresh tokens clear the session; temporary errors retain it for retry", async () => {
  for (const code of ["invalid_grant", "request_failed"]) {
    let removed = false;
    const get = createTokenReader(
      {
        async getTokens() {
          return { accessToken: "old", refreshToken: "old-refresh", isExpired: () => true };
        },
        async setTokens() {
          assert.fail("failed refresh must not overwrite tokens");
        },
        async removeTokens() {
          removed = true;
        },
      },
      async () => {
        throw new OAuthTokenError(code, "Try again");
      },
    );
    await assert.rejects(get(), /Try again/);
    assert.equal(removed, code === "invalid_grant");
  }
});
