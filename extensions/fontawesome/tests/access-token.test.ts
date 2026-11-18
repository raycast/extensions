import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScopedCacheKey,
  getApiTokenConfigurationError,
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

test("reports a helpful configuration error when required scopes are missing", () => {
  assert.equal(
    getApiTokenConfigurationError(["public", "kits_read"]),
    'Your Font Awesome API token is missing the required permissions. Recreate it with "Read kits data", "Allowed domains", and "Pro icons and metadata" enabled.',
  );
});

test("accepts a correctly configured pro token", () => {
  assert.equal(
    getApiTokenConfigurationError(["public", "kits_read", "domains_read", "svg_icons_pro"]),
    undefined,
  );
});

test("does not report missing permissions when token validation is disabled", () => {
  assert.equal(getApiTokenConfigurationError(["public", "kits_read"], false), undefined);
});

test("does not report missing permissions before scopes are loaded", () => {
  assert.equal(getApiTokenConfigurationError(undefined), undefined);
});
