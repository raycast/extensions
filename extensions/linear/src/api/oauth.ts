import { OAuth } from "@raycast/api";

const clientId = "c8ff37b9225c3c9aefd7d66ea0e5b6f1";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Linear",
  providerIcon: "linear.png",
  providerId: "linear",
  description: "Connect your Linear account",
});

export async function authorize() {
  const existingTokens = await oauthClient.getTokens();

  if (existingTokens?.accessToken) {
    await oauthClient.setTokens(existingTokens);
    return;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://linear.oauth-proxy.raycast.com/authorize",
    clientId,
    scope: "read write",
    extraParameters: { actor: "user" },
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
  const response = await fetch("https://linear.oauth-proxy.raycast.com/token", {
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

  return { ...tokens, scope: tokens.scope.join(" ") } as OAuth.TokenResponse;
}
