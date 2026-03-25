import { createHash } from "node:crypto";

type RefreshAccessTokenOptions = {
  accessToken: string;
  tokenTimeStart?: number;
  now?: number;
  ttlMs?: number;
};

export function getApiTokenFingerprint(apiToken: string) {
  return createHash("sha256").update(apiToken).digest("hex");
}

export function buildScopedCacheKey(baseKey: string, scope: string, suffix?: string) {
  return [baseKey, scope, suffix].filter(Boolean).join(":");
}

export function getAccessTokenStorageKeys(apiToken: string) {
  const tokenFingerprint = getApiTokenFingerprint(apiToken);
  return {
    tokenFingerprint,
    accessTokenKey: buildScopedCacheKey("accessToken", tokenFingerprint),
    expiryKey: buildScopedCacheKey("token-expiry-start", tokenFingerprint),
  };
}

export function shouldRefreshAccessToken({
  accessToken,
  tokenTimeStart,
  now = Date.now(),
  ttlMs = 3_600_000,
}: RefreshAccessTokenOptions) {
  return !accessToken || !tokenTimeStart || now - tokenTimeStart >= ttlMs;
}
