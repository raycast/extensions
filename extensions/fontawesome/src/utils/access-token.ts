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

const REQUIRED_PRO_TOKEN_SCOPES = ["kits_read", "domains_read", "svg_icons_pro"];

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

export function getApiTokenConfigurationError(scopes: string[] | undefined, shouldValidate = true) {
  if (!shouldValidate || scopes === undefined) {
    return undefined;
  }

  const hasRequiredScopes = REQUIRED_PRO_TOKEN_SCOPES.every((scope) => scopes.includes(scope));

  if (hasRequiredScopes) {
    return undefined;
  }

  return 'Your Font Awesome API token is missing the required permissions. Recreate it with "Read kits data", "Allowed domains", and "Pro icons and metadata" enabled.';
}
