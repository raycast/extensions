import { OAuth, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { URLSearchParams } from "url";

const OLD_OAUTH_ID = "76a7c93f-0834-41ba-82a5-e23e771fb19f";
const NEW_OAUTH_ID = "59e5ecce-9dc8-4881-89c8-98d44be1e68a";
const { airtableOAuthClientId: CURRENT_OAUTH_ID, airtableUiBaseUrl } = getPreferenceValues<Preferences>();
const scopes = ["schema.bases:read", "data.records:read", "data.records:write"];

// Since the previous ID was set as "default" in Airtable, when old uses update the extension they will still get the old ID
// So we check if the ID is the old one, then it needs to be updated to the new one
const airtableOAuthClientId = CURRENT_OAUTH_ID === OLD_OAUTH_ID ? NEW_OAUTH_ID : CURRENT_OAUTH_ID;

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Airtable",
  providerIcon: "airtable-logo.png",
  providerId: "airtable",
  description: "Connect your Airtable account",
});

// Authorization
export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();

  // If already authorized
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  // Othwerwise, go through authorization flow
  const authRequest = await client.authorizationRequest({
    endpoint: `${airtableUiBaseUrl}/oauth2/v1/authorize`,
    clientId: airtableOAuthClientId,
    scope: scopes.join(" "),
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const bodyParams = new URLSearchParams();
  bodyParams.append("client_id", airtableOAuthClientId);
  bodyParams.append("code", authCode);
  bodyParams.append("code_verifier", authRequest.codeVerifier);
  bodyParams.append("grant_type", "authorization_code");
  bodyParams.append("code_challenge_method", "S256");
  bodyParams.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(`${airtableUiBaseUrl}/oauth2/v1/token`, {
    method: "POST",
    body: bodyParams,
  });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const bodyParams = new URLSearchParams();
  bodyParams.append("client_id", airtableOAuthClientId);
  bodyParams.append("grant_type", "refresh_token");
  bodyParams.append("refresh_token", refreshToken);

  const response = await fetch(`${airtableUiBaseUrl}/oauth2/v1/token`, {
    method: "POST",
    body: bodyParams,
  });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}
