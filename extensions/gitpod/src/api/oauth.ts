import { OAuth, environment } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "7235fe8d42157f1f38c0";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: environment.theme === "light" ? "Icons/gh-icon.png" : "Icons/gh-icon@dark.png",
  providerId: "github",
  description: "Connect your GitHub account",
});

export async function authorize() {
  const existingTokens = await oauthClient.getTokens();

  if (existingTokens?.accessToken) {
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://github.oauth.raycast.com/authorize",
    clientId,
    scope: "repo read:org user",
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
  const response = await fetch("https://github.oauth.raycast.com/token", {
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

  const tokens = await response.json();

  return tokens as OAuth.TokenResponse;
}
