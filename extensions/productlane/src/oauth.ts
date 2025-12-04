import { OAuth } from "@raycast/api";
import axios from "axios";
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
    return existingTokens.accessToken;
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://linear.oauth.raycast.com/authorize",
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
  const response = await axios("https://linear.oauth.raycast.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    }),
  });

  if (!response.data) {
    throw new Error(response.statusText);
  }

  const tokens = response.data;

  return { ...tokens, scope: tokens.scope.join(" ") } as OAuth.TokenResponse;
}
