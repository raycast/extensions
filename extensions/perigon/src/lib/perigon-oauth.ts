import { LocalStorage, OAuth } from "@raycast/api";

/** Must match `com.gawq.mcp.oauth.resource` (origin only, not the `/v1/mcp` path). */
export const MCP_RESOURCE = "https://mcp.perigon.io";
export const MCP_ORIGIN = "https://mcp.perigon.io";
/** Raycast's web redirect is this static URI for every extension, not the package name. */
export const PERIGON_REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";

const CLIENT_STORAGE_KEY = "perigon-raycast-oauth-client-id-v2";

export const perigonOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Perigon",
  providerIcon: "icon.png",
  providerId: "perigon-commands",
  description: "Connect your Perigon account for native commands.",
});

async function registerOAuthClient(): Promise<string> {
  const response = await fetch(`${MCP_ORIGIN}/v1/mcp/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Perigon for Raycast",
      redirect_uris: [PERIGON_REDIRECT_URI],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    }),
  });

  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error_description" in body
        ? String((body as { error_description: unknown }).error_description)
        : `OAuth client registration failed (${response.status})`;
    throw new Error(message);
  }

  if (typeof body !== "object" || body === null || !("client_id" in body)) {
    throw new Error("OAuth client registration returned an invalid response.");
  }

  const clientId = (body as { client_id: unknown }).client_id;
  if (typeof clientId !== "string" || clientId.length === 0) {
    throw new Error("OAuth client registration returned an invalid client ID.");
  }

  await LocalStorage.setItem(CLIENT_STORAGE_KEY, clientId);
  return clientId;
}

async function getOAuthClientId(): Promise<string> {
  const cached = await LocalStorage.getItem<string>(CLIENT_STORAGE_KEY);
  if (cached) {
    return cached;
  }
  return registerOAuthClient();
}

function authorizationUrl(authRequest: OAuth.AuthorizationRequest): string {
  const url = new URL(authRequest.toURL());
  url.searchParams.set("resource", MCP_RESOURCE);
  return url.toString();
}

async function exchangeAuthorizationCode(
  clientId: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<OAuth.TokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    resource: MCP_RESOURCE,
  });
  const response = await fetch(`${MCP_ORIGIN}/v1/mcp/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const description =
      typeof payload === "object" && payload !== null && "error_description" in payload
        ? String((payload as { error_description: unknown }).error_description)
        : `Perigon token exchange failed (${response.status})`;
    throw new Error(description);
  }
  if (typeof payload !== "object" || payload === null || !("access_token" in payload)) {
    throw new Error("Perigon token exchange returned an invalid response.");
  }
  const accessToken = (payload as { access_token: unknown }).access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error("Perigon token exchange returned an invalid access token.");
  }
  const expiresIn = "expires_in" in payload ? (payload as { expires_in: unknown }).expires_in : undefined;
  const scope = "scope" in payload ? (payload as { scope: unknown }).scope : undefined;
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: typeof expiresIn === "number" ? expiresIn : undefined,
    scope: typeof scope === "string" ? scope : undefined,
  };
}

/** Search News, Search Stories, and My Monitors all authorize through this function. */
export async function authorizePerigon(): Promise<string> {
  const existing = await perigonOAuthClient.getTokens();
  if (existing?.accessToken && !existing.isExpired()) {
    return existing.accessToken;
  }
  if (existing) {
    await perigonOAuthClient.removeTokens();
  }

  const clientId = await getOAuthClientId();
  const authRequest = await perigonOAuthClient.authorizationRequest({
    endpoint: `${MCP_ORIGIN}/oauth/authorize`,
    clientId,
    scope: "mcp",
    extraParameters: { resource: MCP_RESOURCE },
  });
  const { authorizationCode } = await perigonOAuthClient.authorize({ url: authorizationUrl(authRequest) });
  const tokens = await exchangeAuthorizationCode(
    clientId,
    authorizationCode,
    authRequest.codeVerifier,
    authRequest.redirectURI,
  );
  await perigonOAuthClient.setTokens(tokens);
  return tokens.access_token;
}

export const perigonOAuth = {
  client: perigonOAuthClient,
  authorize: authorizePerigon,
};
