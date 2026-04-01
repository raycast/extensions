import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScopedCacheKey,
  getAccessTokenStorageKeys,
  shouldRefreshAccessToken,
} from "../src/utils/access-token.ts";

test("creates distinct storage keys for different API tokens", () => {
  const freeKeys = getAccessTokenStorageKeys("free-token");
  const proKeys = getAccessTokenStorageKeys("pro-token");

  assert.notEqual(freeKeys.accessTokenKey, proKeys.accessTokenKey);
  assert.notEqual(freeKeys.expiryKey, proKeys.expiryKey);
});

test("does not refresh an unexpired cached access token", () => {
  assert.equal(
    shouldRefreshAccessToken({
      accessToken: "cached-access-token",
      tokenTimeStart: 1_700_000_000_000,
      now: 1_700_000_100_000,
      ttlMs: 3_600_000,
    }),
    false,
  );
});

test("refreshes when there is no cached access token for the selected API token", () => {
  assert.equal(
    shouldRefreshAccessToken({
      accessToken: "",
      tokenTimeStart: undefined,
      now: 1_700_000_100_000,
      ttlMs: 3_600_000,
    }),
    true,
  );
});

test("buildScopedCacheKey keeps scopes stable and readable", () => {
  assert.equal(buildScopedCacheKey("iconData", "token-a"), "iconData:token-a");
  assert.equal(buildScopedCacheKey("iconData", "token-a", "far"), "iconData:token-a:far");
});
