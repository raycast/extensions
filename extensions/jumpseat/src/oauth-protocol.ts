import {
  isCompatibleJumpseatConfigurationId,
  isLegacyJumpseatConfigurationId,
  jumpseatConfigurationId,
  type JumpseatConfiguration,
} from "./config-values";

export const JUMPSEAT_OAUTH_CLIENT_ID = "jumpseat-raycast";
export const JUMPSEAT_OAUTH_SCOPE = "flights:upcoming:read";

export type JumpseatAuthProtocol = "legacy" | "central";

export interface OAuthAuthorizationRequestPlan {
  endpoint: string;
  clientId: string;
  scope: string;
  extraParameters?: Record<string, string>;
}

export function oauthEndpoint(authBaseUrl: string, path: string): URL {
  return new URL(path, authBaseUrl);
}

export function oauthForm(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

export function isCentralOAuthAuthorizationServer(
  body: unknown,
  authBaseUrl: string,
): boolean {
  if (!body || typeof body !== "object") return false;
  const document = body as {
    issuer?: unknown;
    authorization_endpoint?: unknown;
    token_endpoint?: unknown;
  };
  return (
    document.issuer === authBaseUrl &&
    document.authorization_endpoint ===
      oauthEndpoint(authBaseUrl, "/oauth/authorize").toString() &&
    document.token_endpoint ===
      oauthEndpoint(authBaseUrl, "/oauth/token").toString()
  );
}

export function buildAuthorizationRequestPlan(
  configuration: JumpseatConfiguration,
  protocol: JumpseatAuthProtocol,
): OAuthAuthorizationRequestPlan {
  if (protocol === "legacy") {
    return {
      endpoint: oauthEndpoint(
        configuration.webBaseUrl,
        "/connect/raycast",
      ).toString(),
      clientId: JUMPSEAT_OAUTH_CLIENT_ID,
      scope: JUMPSEAT_OAUTH_SCOPE,
    };
  }

  return {
    endpoint: oauthEndpoint(
      configuration.authBaseUrl,
      "/oauth/authorize",
    ).toString(),
    clientId: JUMPSEAT_OAUTH_CLIENT_ID,
    scope: JUMPSEAT_OAUTH_SCOPE,
    extraParameters: { resource: configuration.apiBaseUrl },
  };
}

export function buildAuthorizationCodeExchangeRequest(
  configuration: JumpseatConfiguration,
  protocol: JumpseatAuthProtocol,
  input: { code: string; redirectUri: string; codeVerifier: string },
): { url: URL; contentType: string; body: string } {
  const values = {
    grant_type: "authorization_code",
    code: input.code,
    client_id: JUMPSEAT_OAUTH_CLIENT_ID,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  };
  if (protocol === "legacy") {
    return {
      url: new URL("/api/v1/auth/oauth/token", configuration.apiBaseUrl),
      contentType: "application/json",
      body: JSON.stringify(values),
    };
  }

  return {
    url: oauthEndpoint(configuration.authBaseUrl, "/oauth/token"),
    contentType: "application/x-www-form-urlencoded",
    body: oauthForm({ ...values, resource: configuration.apiBaseUrl }),
  };
}

export function buildRefreshRequest(
  configuration: JumpseatConfiguration,
  refreshToken: string,
  protocol: JumpseatAuthProtocol,
): { url: URL; contentType: string; body: string } {
  if (protocol === "legacy") {
    return {
      url: new URL("/api/v1/auth/refresh", configuration.apiBaseUrl),
      contentType: "application/json",
      body: JSON.stringify({ refreshToken }),
    };
  }

  return {
    url: oauthEndpoint(configuration.authBaseUrl, "/oauth/token"),
    contentType: "application/x-www-form-urlencoded",
    body: oauthForm({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: JUMPSEAT_OAUTH_CLIENT_ID,
      resource: configuration.apiBaseUrl,
    }),
  };
}

export function isDefinitiveOAuthTokenFailure(
  status: number,
  body: unknown,
  protocol: JumpseatAuthProtocol,
): boolean {
  // The legacy API rejects expired/revoked refresh tokens with HTTP 401.
  // The central OAuth server may also use 401 for client authentication errors.
  if (status === 401 && protocol === "legacy") return true;
  if ((status !== 400 && status !== 401) || !body || typeof body !== "object")
    return false;
  const error = body as { error?: unknown; code?: unknown };
  return error.error === "invalid_grant" || error.code === "invalid_grant";
}

export function resolveStoredAuthProtocol(
  storedConfigurationId: string | undefined,
  storedProtocol: string | undefined,
  configuration: JumpseatConfiguration,
): JumpseatAuthProtocol | undefined {
  if (
    !isCompatibleJumpseatConfigurationId(storedConfigurationId, configuration)
  ) {
    return undefined;
  }
  if (isLegacyJumpseatConfigurationId(storedConfigurationId)) {
    return "legacy";
  }
  if (storedProtocol === "legacy" || storedProtocol === "central") {
    return storedProtocol;
  }

  return storedConfigurationId === jumpseatConfigurationId(configuration)
    ? "central"
    : undefined;
}
