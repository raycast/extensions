import { getPreferenceValues, OAuth } from "@raycast/api";
import "cross-fetch/polyfill";
import { URLSearchParams } from "url";

const preferences = getPreferenceValues<Preferences>();

const clientId = preferences.oauthClientId;
const clientSecret = preferences.oauthClientSecret;
const scopes = ["profile:read"];
const authorizeUrl = "https://www.canva.com/api/oauth/authorize";
const redirectUri = "https://raycast.com/redirect/extension";
const tokenUrl = "https://api.canva.com/rest/v1/oauth/token";

export const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Canva",
    providerIcon: "command-icon.png",
    description: "Connect your Canva account"
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
    endpoint: authorizeUrl,
    clientId: clientId,
    scope: scopes.join(" "),
    extraParameters: {
        "redirect_uri": redirectUri
    }
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}
export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const bodyParams = new URLSearchParams();
  bodyParams.append("client_id", clientId);
  bodyParams.append("client_secret", clientSecret);
  bodyParams.append("code", authCode);
  bodyParams.append("code_verifier", authRequest.codeVerifier);
  bodyParams.append("grant_type", "authorization_code");
  bodyParams.append("code_challenge_method", "S256");
    bodyParams.append("redirect_uri", redirectUri);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
    },
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
  bodyParams.append("client_id", clientId);
  bodyParams.append("grant_type", "refresh_token");
  bodyParams.append("refresh_token", refreshToken);
  bodyParams.append("redirect_uri", redirectUri);

  const response = await fetch(tokenUrl, {
    method: "POST",
    body: bodyParams,
  });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}
