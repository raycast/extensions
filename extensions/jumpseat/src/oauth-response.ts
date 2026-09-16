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

export function parseOAuthTokenResponse(
  body: unknown,
): JumpseatOAuthTokenResponse | null {
  if (!isRecord(body)) return null;
  if (
    !isCredential(body.access_token) ||
    !isCredential(body.refresh_token) ||
    body.token_type !== "Bearer" ||
    !isExpiresIn(body.expires_in) ||
    typeof body.scope !== "string" ||
    body.scope.length === 0
  ) {
    return null;
  }
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in,
    scope: body.scope,
  };
}

export function parseRefreshResponse(
  body: unknown,
): JumpseatRefreshResponse | null {
  if (!isRecord(body)) return null;
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
