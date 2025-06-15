import { OAuth } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "YmDF3nLYeimUqKY6ACWQE6SIkCUQMIgCwoIOW2iy4Co";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Height",
  providerIcon: "height-app.png",
  providerId: "height",
  description: "Connect your Height account…",
});

export async function authorize() {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet?.refreshToken && tokenSet?.isExpired()) {
      const tokens = await refreshTokens(tokenSet.refreshToken);

      await client.setTokens(tokens);
      return tokens.access_token;
    }

    return tokenSet.accessToken;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://height.app/oauth/authorization",
    clientId,
    scope: "api",
  });

  const { authorizationCode } = await client.authorize(authRequest);

  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);

  return tokens.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string) {
  const response = await fetch("https://api.height.app/oauth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: authCode,
      client_id: clientId,
      code_verifier: authRequest.codeVerifier,
      redirect_uri: authRequest.redirectURI,
      grant_type: "authorization_code",
      scope: ["api"],
    }),
  });

  if (!response.ok) {
    console.error("Fetch tokens error: ", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://api.height.app/oauth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: clientId,
      grant_type: "refresh_token",
      scope: ["api"],
    }),
  });

  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;

  return tokenResponse;
}
