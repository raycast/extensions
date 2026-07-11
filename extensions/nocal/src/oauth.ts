import { OAuth } from "@raycast/api";
import { getPreferences } from "./preferences";

const CLIENT_ID = "nocal-raycast-extension";
const SCOPES = "account:read notes:read notes:write events:read events:write offline_access";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "nocal",
  providerIcon: "nocal-icon.png",
  description: "Connect your nocal account to use notes and meetings in Raycast.",
});

export class OAuthCancellationError extends Error {
  constructor(message = "Connection canceled.") {
    super(message);
    this.name = "OAuthCancellationError";
  }
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

function formBody(values: Record<string, string>) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    body.set(key, value);
  }

  return body;
}

function toStoredTokenResponse(tokens: TokenResponse, fallbackRefreshToken?: string): TokenResponse {
  return {
    ...tokens,
    refresh_token: tokens.refresh_token || fallbackRefreshToken,
  };
}

function shouldReauthenticate(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("invalid_grant") ||
    message.includes("invalid_client") ||
    message.includes("invalid_request") ||
    message.includes("refresh token") ||
    message.includes("token is invalid") ||
    message.includes("token has expired")
  );
}

async function tokenRequest(body: URLSearchParams) {
  const { authBaseUrl } = getPreferences();
  const response = await fetch(`${authBaseUrl}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `OAuth token request failed with status ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}

async function exchangeAuthorizationCode() {
  const { authBaseUrl } = getPreferences();
  const authorizationRequest = await client.authorizationRequest({
    endpoint: `${authBaseUrl}/oauth/authorize/`,
    clientId: CLIENT_ID,
    scope: SCOPES,
  });
  let authorizationResponse: Awaited<ReturnType<typeof client.authorize>>;

  try {
    authorizationResponse = await client.authorize(authorizationRequest);
  } catch (error) {
    if (isOAuthCancellation(error)) {
      throw new OAuthCancellationError();
    }

    throw error;
  }
  const tokens = await tokenRequest(
    formBody({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: authorizationResponse.authorizationCode,
      code_verifier: authorizationRequest.codeVerifier,
      redirect_uri: authorizationRequest.redirectURI,
    }),
  );

  await client.setTokens(toStoredTokenResponse(tokens));
  return tokens.access_token;
}

async function refreshAccessToken(refreshToken: string) {
  const tokens = await tokenRequest(
    formBody({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  );

  await client.setTokens(toStoredTokenResponse(tokens, refreshToken));

  return tokens.access_token;
}

export async function connectNocalAccount() {
  return await exchangeAuthorizationCode();
}

export async function disconnectNocalAccount() {
  await client.removeTokens();
}

export async function getAccessToken() {
  const storedTokens = await client.getTokens();

  if (!storedTokens) {
    return await exchangeAuthorizationCode();
  }

  if (!storedTokens.isExpired()) {
    return storedTokens.accessToken;
  }

  if (storedTokens.refreshToken) {
    try {
      return await refreshAccessToken(storedTokens.refreshToken);
    } catch (error) {
      if (shouldReauthenticate(error)) {
        await client.removeTokens();
        return await exchangeAuthorizationCode();
      }

      throw error;
    }
  }

  return await exchangeAuthorizationCode();
}

export function isOAuthCancellation(error: unknown) {
  if (error instanceof OAuthCancellationError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("access_denied") ||
    message.includes("access denied") ||
    message.includes("canceled") ||
    message.includes("cancelled") ||
    message.includes("denied the request")
  );
}
