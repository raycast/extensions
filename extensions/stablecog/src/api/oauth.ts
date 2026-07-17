import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "e1d7e2fd-a173-473b-98f2-680d14283e75";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Stablecog",
  providerIcon: "stablecog.png",
  providerId: "stablecog",
  description: "Connect your Stablecog account",
});

export async function authorize() {
  const existingTokens = await oauthClient.getTokens();
  if (existingTokens?.accessToken) {
    return existingTokens.accessToken;
  }
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://auth.stablecog.com/oauth/authorize",
    clientId,
    scope: "read write",
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokens);
  return tokens.access_token;
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://auth.stablecog.com/oauth/token", {
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

  const tokens = (await response.json()) as OAuth.TokenResponse;
  return tokens;
}
