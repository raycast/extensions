export const CLIENT_ID = "UmF5Y2FzdA==";
export const REDIRECT_URI = "https://raycast.com/redirect?packageName=RevenueCat";
export const SCOPES = [
  "project_configuration:projects:read",
  "project_configuration:products:read",
  "project_configuration:offerings:read",
  "customer_information:customers:read",
  "customer_information:subscriptions:read",
  "charts_metrics:overview:read",
  "charts_metrics:charts:read",
];
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}
export function hasRequiredScopes(granted: string | undefined, required: string[] = SCOPES) {
  const patterns =
    granted
      ?.split(/\s+/)
      .filter(Boolean)
      .map((scope) => scope.split(":")) || [];
  return required.every((scope) => {
    const parts = scope.split(":");
    return patterns.some(
      (pattern) =>
        pattern.length === parts.length && pattern.every((part, index) => part === "*" || part === parts[index]),
    );
  });
}
export class OAuthTokenError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function exchangeToken(
  parameters: Record<string, string>,
  request: typeof fetch = fetch,
): Promise<TokenResponse> {
  const response = await request("https://api.revenuecat.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ ...parameters, client_id: CLIENT_ID }),
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Never expose provider response text: it may contain authorization credentials.
    const code = ["invalid_grant", "invalid_client", "invalid_scope"].includes(body.error)
      ? body.error
      : "request_failed";
    const message =
      code === "invalid_grant"
        ? "Your RevenueCat connection expired or was revoked. Sign in again."
        : code === "invalid_client"
          ? "RevenueCat rejected the registered OAuth client. Check its registration and redirect URI."
          : code === "invalid_scope"
            ? "RevenueCat has not enabled the requested permissions for this OAuth client."
            : `RevenueCat sign-in failed (HTTP ${response.status}). Try again.`;
    throw new OAuthTokenError(code, message);
  }
  if (
    typeof body.access_token !== "string" ||
    !body.access_token ||
    typeof body.refresh_token !== "string" ||
    !body.refresh_token ||
    typeof body.token_type !== "string" ||
    body.token_type.toLowerCase() !== "bearer" ||
    !Number.isFinite(body.expires_in) ||
    body.expires_in <= 0 ||
    (body.scope !== undefined && typeof body.scope !== "string")
  ) {
    throw new Error("RevenueCat returned an invalid OAuth token response. Sign in again.");
  }
  return body as TokenResponse;
}
interface StoredTokens {
  accessToken: string;
  scope?: string;
  refreshToken?: string;
  isExpired(): boolean;
}
interface TokenStore {
  getTokens(): Promise<StoredTokens | undefined>;
  setTokens(tokens: TokenResponse): Promise<void>;
  removeTokens(): Promise<void>;
}
export function createTokenReader(store: TokenStore, exchange = exchangeToken) {
  let pending: Promise<string | undefined> | undefined;
  return function getAccessToken(): Promise<string | undefined> {
    if (pending) return pending;
    pending = (async () => {
      const tokens = await store.getTokens();
      if (!tokens) return undefined;
      if (!tokens.isExpired()) return tokens.accessToken;
      if (!tokens.refreshToken) {
        await store.removeTokens();
        throw new Error("Your RevenueCat connection expired. Sign in again.");
      }
      try {
        const refreshed = await exchange({ grant_type: "refresh_token", refresh_token: tokens.refreshToken });
        if (refreshed.scope === undefined && tokens.scope) refreshed.scope = tokens.scope;
        // RevenueCat rotates both tokens; persist the complete response before any API calls proceed.
        await store.setTokens(refreshed);
        return refreshed.access_token;
      } catch (error) {
        if (error instanceof OAuthTokenError && error.code === "invalid_grant") await store.removeTokens();
        throw error;
      }
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
