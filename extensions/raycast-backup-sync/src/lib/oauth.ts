import { OAuth, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

/**
 * Google OAuth via Raycast's PKCE client.
 *
 * Setup expected of the user (documented in README): create an OAuth 2.0 client of
 * type "Web application" in Google Cloud, add redirect URI https://raycast.com/redirect,
 * enable the Drive API, and paste the Client ID (and Secret) into this extension's
 * preferences. We request only the drive.file scope — access is limited to files this
 * extension creates.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Google Drive",
  providerIcon: "extension-icon.png",
  description: "Connect a Google account to store your Raycast backups.",
});

function credentials(): { clientId: string; clientSecret?: string } {
  const prefs = getPreferenceValues<Preferences>();
  const clientId = prefs.googleClientID?.trim();
  if (!clientId) {
    throw new Error(
      "Missing Google OAuth Client ID. Set it in this extension's preferences.",
    );
  }
  return {
    clientId,
    clientSecret: prefs.googleClientSecret?.trim() || undefined,
  };
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

/** Returns a valid access token, running the auth flow or refreshing as needed. */
export async function authorize(): Promise<string> {
  const { clientId, clientSecret } = credentials();

  const existing = await client.getTokens();
  if (existing?.accessToken) {
    if (existing.refreshToken && existing.isExpired()) {
      const refreshed = await refreshTokens(
        existing.refreshToken,
        clientId,
        clientSecret,
      );
      await client.setTokens(refreshed);
      return refreshed.access_token;
    }
    if (!existing.isExpired()) {
      return existing.accessToken;
    }
  }

  const authRequest = await client.authorizationRequest({
    endpoint: AUTH_ENDPOINT,
    clientId,
    scope: SCOPE,
    extraParameters: {
      // Force a refresh token to be issued so backups keep working unattended.
      access_type: "offline",
      prompt: "consent",
    },
  });

  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(
    authorizationCode,
    authRequest,
    clientId,
    clientSecret,
  );
  await client.setTokens(tokens);
  return tokens.access_token;
}

/** Whether a Google account is currently connected (a token is stored). */
export async function isAuthorized(): Promise<boolean> {
  const tokens = await client.getTokens();
  return Boolean(tokens?.accessToken);
}

/** Disconnect the Google account by removing stored tokens. */
export async function logout(): Promise<void> {
  await client.removeTokens();
}

async function exchangeCode(
  code: string,
  authRequest: OAuth.AuthorizationRequest,
  clientId: string,
  clientSecret?: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: authRequest.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: authRequest.redirectURI,
  });
  if (clientSecret) body.append("client_secret", clientSecret);

  return postToken(body, "exchange the authorization code");
}

async function refreshTokens(
  refreshToken: string,
  clientId: string,
  clientSecret?: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  if (clientSecret) body.append("client_secret", clientSecret);

  const tokens = await postToken(body, "refresh the access token");
  // Google omits the refresh token on refresh — preserve the existing one.
  if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
  return tokens;
}

async function postToken(
  body: URLSearchParams,
  action: string,
): Promise<GoogleTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    const detail = await safeErrorDetail(response);
    throw new Error(`Failed to ${action}: ${response.status} ${detail}`);
  }
  return (await response.json()) as GoogleTokenResponse;
}

async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      error?: string;
      error_description?: string;
    };
    return data.error_description || data.error || response.statusText;
  } catch {
    return response.statusText;
  }
}
