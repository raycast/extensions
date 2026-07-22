/**
 * Microsoft Entra sign-in for the reverse (tenant ID → domain) lookup.
 *
 * Uses the OAuth 2.0 authorization-code flow with PKCE via a *public client*
 * (no client secret). Only the Application (client) ID is needed, which is not
 * a secret. Each user signs into their own tenant and consents to a single,
 * low-privilege delegated scope: `CrossTenantInformation.ReadBasic.All`.
 */

import { OAuth } from "@raycast/api";

/**
 * Embedded Application (client) ID so end users just click "Sign in with Microsoft"
 * with zero setup. This is a PUBLIC identifier, not a secret — safe to commit.
 * To point the extension at your own Entra app registration, replace the GUID below.
 */
const CLIENT_ID = "45666adf-6a4e-48d0-9801-217cb0e0f6da";
/** `organizations` = multitenant: each user signs into their own tenant. */
const TENANT = "organizations";
const REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";
const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const SCOPES = ["openid", "offline_access", "CrossTenantInformation.ReadBasic.All"];

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Microsoft Entra",
  providerIcon: "icon.png",
  providerId: "microsoft-entra",
  description: "Sign in with your Microsoft account to look up tenants by ID.",
});

interface MicrosoftTokenResponse extends OAuth.TokenResponse {
  error?: string;
  error_description?: string;
}

function tokenError(json: MicrosoftTokenResponse, status: number): Error {
  if (json.error_description?.includes("AADSTS7000218")) {
    return new Error(
      "The app registration is configured as a confidential client. In Entra → Authentication, add the platform " +
        "'Mobile and desktop applications' with redirect URI https://raycast.com/redirect?packageName=Extension and " +
        "enable 'Allow public client flows'.",
    );
  }
  return new Error(json.error_description || json.error || `Token request failed (${status})`);
}

async function postToken(params: URLSearchParams): Promise<MicrosoftTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = (await res.json()) as MicrosoftTokenResponse;
  if (!res.ok) throw tokenError(json, res.status);
  return json;
}

async function exchangeCode(authRequest: OAuth.AuthorizationRequest, code: string) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    code_verifier: authRequest.codeVerifier,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
  });
  return postToken(params);
}

async function refresh(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES.join(" "),
  });
  const tokens = await postToken(params);
  tokens.refresh_token = tokens.refresh_token ?? refreshToken;
  return tokens;
}

/**
 * `withAccessToken`-compatible authorizer: returns a valid access token,
 * refreshing silently or launching the interactive sign-in as needed.
 */
export async function authorize(): Promise<string> {
  const existing = await oauthClient.getTokens();
  if (existing?.accessToken && !existing.isExpired()) return existing.accessToken;
  if (existing?.refreshToken) {
    try {
      const refreshed = await refresh(existing.refreshToken);
      await oauthClient.setTokens(refreshed);
      if (refreshed.access_token) return refreshed.access_token;
    } catch {
      // Refresh failed (e.g. revoked) — fall through to interactive sign-in.
    }
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId: CLIENT_ID,
    scope: SCOPES.join(" "),
    extraParameters: { redirect_uri: REDIRECT_URI, response_mode: "query" },
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await exchangeCode(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);
  return tokens.access_token as string;
}

export async function logout(): Promise<void> {
  await oauthClient.removeTokens();
}
