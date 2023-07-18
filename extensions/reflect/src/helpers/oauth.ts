import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

// This is a temporary workaround hosted by the Raycast team until the Reflect OAuth API supports PKCE
const OAUTH_PKCE_PROXY_URL = "https://reflect-pkce-oauth-proxy.herokuapp.com";
const clientId = "7212886f8a614d4c949f4699c11b076f";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Reflect",
  providerIcon: "reflect.png",
  providerId: "reflect",
  description: "Connect your Reflect account",
});

export async function authorize() {
  const existingTokens = await oauthClient.getTokens();

  if (existingTokens?.accessToken) {
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: OAUTH_PKCE_PROXY_URL + "/authorize",
    clientId,
    scope: "read:graph write:graph",
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
  const response = await fetch(OAUTH_PKCE_PROXY_URL + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return (await response.json()) as OAuth.TokenResponse;
}
