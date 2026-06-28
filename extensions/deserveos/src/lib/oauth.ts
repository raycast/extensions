import { LocalStorage, OAuth } from "@raycast/api";

import { getApiBaseUrl, getWorkspaceUrl } from "./preferences";

// Browser-based sign-in via DeserveOS's native-app OAuth2 + PKCE flow. The user
// authenticates however they normally do on the web (Google included), so we
// never handle their password. We dynamically register a public OAuth client
// (RFC 7591) the first time, then run the standard authorization-code flow.

export class AuthError extends Error {
  constructor(message = "You are not connected to DeserveOS.") {
    super(message);
    this.name = "AuthError";
  }
}

const SCOPE = "api profile";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "DeserveOS",
  providerIcon: "extension-icon.png",
  providerId: "deserveos",
  description: "Connect your DeserveOS workspace to Raycast.",
});

// The authorize page lives on the workspace subdomain (it carries the workspace
// session); the token/register endpoints live on the central API host.
const authorizeEndpoint = () => `${getWorkspaceUrl()}/authorize`;
const tokenEndpoint = () => `${getApiBaseUrl()}/oauth/token`;
const registerEndpoint = () => `${getApiBaseUrl()}/oauth/register`;
const clientIdKey = () => `oauth.clientId.${getApiBaseUrl()}`;

type OAuthTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

async function registerClient(redirectUri: string): Promise<string> {
  const response = await fetch(registerEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: "DeserveOS for Raycast",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    }),
  });

  const json = (await response.json()) as {
    client_id?: string;
    error?: string;
    error_description?: string;
  };

  if (!json.client_id) {
    throw new Error(json.error_description ?? json.error ?? "Could not register the Raycast app with DeserveOS.");
  }

  return json.client_id;
}

async function getClientId(redirectUri: string): Promise<string> {
  const cached = await LocalStorage.getItem<string>(clientIdKey());
  if (cached) return cached;

  const clientId = await registerClient(redirectUri);
  await LocalStorage.setItem(clientIdKey(), clientId);
  return clientId;
}

async function postToken(body: Record<string, string>): Promise<OAuthTokenResponse> {
  const response = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as OAuthTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `Token request failed (HTTP ${response.status}).`);
  }

  return json;
}

export async function authorize(): Promise<void> {
  // authorizationRequest() is a local operation (it only generates the PKCE
  // material and reveals the Raycast redirect URI). We call it once up front so
  // we can register an OAuth client whose redirect URI matches exactly.
  const probe = await client.authorizationRequest({
    endpoint: authorizeEndpoint(),
    clientId: "pending",
    scope: SCOPE,
  });
  const redirectUri = probe.redirectURI;

  const clientId = await getClientId(redirectUri);

  const request = await client.authorizationRequest({
    endpoint: authorizeEndpoint(),
    clientId,
    scope: SCOPE,
  });
  const { authorizationCode } = await client.authorize(request);

  const tokens = await postToken({
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: request.codeVerifier,
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  await client.setTokens(tokens);
}

async function refresh(refreshToken: string): Promise<string> {
  const clientId = await LocalStorage.getItem<string>(clientIdKey());
  if (!clientId) {
    throw new AuthError("Please reconnect to DeserveOS.");
  }

  const tokens = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  await client.setTokens(tokens);
  return tokens.access_token;
}

export async function getValidAccessToken(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    throw new AuthError();
  }

  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    return refresh(tokenSet.refreshToken);
  }

  return tokenSet.accessToken;
}

export async function forceRefresh(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.refreshToken) {
    throw new AuthError("Your session has expired. Please reconnect to DeserveOS.");
  }
  return refresh(tokenSet.refreshToken);
}

export async function isConnected(): Promise<boolean> {
  const tokenSet = await client.getTokens();
  return Boolean(tokenSet?.accessToken);
}

export async function logout(): Promise<void> {
  await client.removeTokens();
}
