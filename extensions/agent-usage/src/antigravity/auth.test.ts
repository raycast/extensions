import assert from "node:assert/strict";
import test from "node:test";

import {
  asAntigravityOAuthCredentials,
  clearAntigravityAccessTokenCache,
  isAntigravityAccessTokenFresh,
  parseAntigravityKeyringSecret,
  resolveAntigravityAccessToken,
} from "./auth.ts";

test("parseAntigravityKeyringSecret accepts plain JSON credentials", () => {
  const credentials = parseAntigravityKeyringSecret(
    JSON.stringify({
      token: {
        access_token: "access",
        refresh_token: "refresh",
        expiry: "2099-01-01T00:00:00Z",
      },
      auth_method: "oauth",
    }),
  );

  assert.equal(credentials?.token.access_token, "access");
  assert.equal(credentials?.token.refresh_token, "refresh");
  assert.equal(credentials?.auth_method, "oauth");
});

test("parseAntigravityKeyringSecret decodes go-keyring base64 wrapper", () => {
  const json = JSON.stringify({
    token: {
      access_token: "access",
      refresh_token: "refresh",
      expiry: "2099-01-01T00:00:00Z",
    },
  });
  const wrapped = `go-keyring-base64:${Buffer.from(json, "utf-8").toString("base64")}`;

  const credentials = parseAntigravityKeyringSecret(wrapped);
  assert.equal(credentials?.token.access_token, "access");
});

test("asAntigravityOAuthCredentials rejects incomplete payloads", () => {
  assert.equal(asAntigravityOAuthCredentials({ token: {} }), null);
  assert.equal(asAntigravityOAuthCredentials(null), null);
});

test("isAntigravityAccessTokenFresh honors skew window", () => {
  const now = Date.parse("2026-09-08T12:00:00Z");

  assert.equal(isAntigravityAccessTokenFresh({ access_token: "a", expiry: "2026-09-08T12:02:00Z" }, now), true);
  assert.equal(isAntigravityAccessTokenFresh({ access_token: "a", expiry: "2026-09-08T12:00:30Z" }, now), false);
});

test("resolveAntigravityAccessToken refreshes stale tokens without writing credentials", async () => {
  clearAntigravityAccessTokenCache();

  let refreshed = false;
  const accessToken = await resolveAntigravityAccessToken({
    nowMs: Date.parse("2026-09-08T12:00:00Z"),
    readCredentials: async () => ({
      token: {
        access_token: "stale-access",
        refresh_token: "refresh",
        expiry: "2020-01-01T00:00:00Z",
      },
    }),
    refreshToken: async () => {
      refreshed = true;
      return { accessToken: "fresh-access", expiresIn: 3600 };
    },
  });

  assert.equal(refreshed, true);
  assert.equal(accessToken, "fresh-access");
  clearAntigravityAccessTokenCache();
});
