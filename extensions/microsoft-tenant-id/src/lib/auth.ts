/**
 * Microsoft Entra sign-in for the reverse (tenant ID → domain) lookup.
 *
 * Uses `@raycast/utils` `OAuthService` (authorization-code + PKCE, public client,
 * no client secret). Only the Application (client) ID is needed, which is not a
 * secret. Each user signs into their own tenant and consents to a single,
 * low-privilege delegated scope: `CrossTenantInformation.ReadBasic.All`.
 *
 * A built-in multitenant app registration (owned by the extension author) is
 * used by default so sign-in needs zero setup. Override it via the optional
 * "Application (client) ID" preference if you prefer your own registration.
 */

import { getPreferenceValues, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

/**
 * Built-in Application (client) ID — a PUBLIC identifier, not a secret.
 * Registration: multitenant public client owned by the extension author
 * (Raycast Store handle `Rediwed`), kept registered for as long as this
 * extension is published. Override via preferences to use your own app.
 */
const DEFAULT_CLIENT_ID = "45666adf-6a4e-48d0-9801-217cb0e0f6da";
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

function getClientId(): string {
  const { clientId } = getPreferenceValues<Preferences>();
  const trimmed = clientId?.trim();
  return trimmed || DEFAULT_CLIENT_ID;
}

/** Build a fresh service so preference changes to the client ID take effect. */
function createOAuthService(): OAuthService {
  return new OAuthService({
    client: oauthClient,
    clientId: getClientId(),
    scope: SCOPES,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    bodyEncoding: "url-encoded",
    extraParameters: { redirect_uri: REDIRECT_URI, response_mode: "query" },
  });
}

/**
 * `withAccessToken`-compatible authorizer: returns a valid access token,
 * refreshing silently or launching the interactive sign-in as needed.
 */
export async function authorize(): Promise<string> {
  await createOAuthService().authorize();
  // Re-read from the client so a refresh-failure → re-auth path still returns
  // the freshly stored access token (OAuthService may otherwise hand back the
  // previous expired one after it re-runs the interactive flow).
  const tokens = await oauthClient.getTokens();
  if (!tokens?.accessToken) {
    throw new Error("Microsoft sign-in did not return an access token.");
  }
  return tokens.accessToken;
}

export async function logout(): Promise<void> {
  await oauthClient.removeTokens();
}
