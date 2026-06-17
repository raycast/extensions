import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "92201";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "WordPress.com",
  providerIcon: "jetpack-logo.png",
  description: "Connect your WordPress.com account to enable Jetpack Commands.",
});
export async function authorize() {
  const existingTokens = await oauthClient.getTokens();

  if (existingTokens?.accessToken) {
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://public-api.wordpress.com/oauth2/authorize",
    clientId,
    scope: "global",
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);

  return tokens.access_token;
}
export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append("client_id", clientId);
  urlSearchParams.append("code", authCode);
  urlSearchParams.append("grant_type", "authorization_code");
  urlSearchParams.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://public-api.wordpress.com/oauth2/token", {
    method: "POST",
    body: urlSearchParams,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const tokens = await response.json();

  return tokens as OAuth.TokenResponse;
}
