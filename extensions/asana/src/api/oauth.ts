import { OAuth } from "@raycast/api";
import axios from "axios";

const clientId = "1191201745684312";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Asana",
  providerIcon: "asana.png",
  providerId: "Asana",
  description: "Connect your Asana account",
});

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://asana.oauth-proxy.raycast.com/authorize",
    clientId,
    scope: "default",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  try {
    const response = await axios.post<OAuth.TokenResponse>("https://asana.oauth-proxy.raycast.com/token", {
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: authRequest.redirectURI,
    });

    return response.data;
  } catch (error) {
    throw new Error("Authentication error: unable to fetch tokens");
  }
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  try {
    const { data: tokenResponse } = await axios.post<OAuth.TokenResponse>(
      "https://asana.oauth-proxy.raycast.com/refresh-token",
      { client_id: clientId, refresh_token: refreshToken, grant_type: "refresh_token" }
    );
    tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;

    return tokenResponse;
  } catch (error) {
    throw new Error("Authentication error: unable to refresh tokens");
  }
}
