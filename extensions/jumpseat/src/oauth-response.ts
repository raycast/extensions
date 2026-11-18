export interface JumpseatOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface JumpseatRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCredential(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 8_192 &&
    value.trim() === value
  );
}

function isExpiresIn(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

// OAuth scopes are an unordered, space-separated set (RFC 6749 §3.3).
function isSameScope(granted: unknown, requested: string): boolean {
  if (typeof granted !== "string") return false;
  const normalize = (scope: string) =>
    [...new Set(scope.split(" ").filter(Boolean))].sort().join(" ");
  return normalize(granted) === normalize(requested);
}

export function parseOAuthTokenResponse(
  body: unknown,
  requestedScope: string,
): JumpseatOAuthTokenResponse | null {
  if (!isRecord(body)) return null;
  if (
    !isCredential(body.access_token) ||
    !isCredential(body.refresh_token) ||
    body.token_type !== "Bearer" ||
    !isExpiresIn(body.expires_in) ||
    (body.scope !== undefined && !isSameScope(body.scope, requestedScope))
  ) {
    return null;
  }
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in,
    scope: requestedScope,
  };
}

export function parseRefreshResponse(
  body: unknown,
): JumpseatRefreshResponse | null {
  if (!isRecord(body)) return null;

  // New OAuth authority responses follow RFC 6749. Keep accepting the
  // current API response while released versions and the authority overlap.
  if (
    isCredential(body.access_token) &&
    isCredential(body.refresh_token) &&
    body.token_type === "Bearer" &&
    isExpiresIn(body.expires_in)
  ) {
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresIn: body.expires_in,
    };
  }

  if (
    !isCredential(body.accessToken) ||
    !isCredential(body.refreshToken) ||
    !isExpiresIn(body.expiresIn)
  ) {
    return null;
  }
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresIn: body.expiresIn,
  };
}
