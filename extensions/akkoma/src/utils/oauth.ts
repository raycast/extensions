import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { Preference } from "./types";
import apiServer from "./api";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Akkoma",
  providerIcon: "akkoma-icon.png",
  providerId: "akkoma",
  description: "Connect to your Akkoma / Pleroma acount",
});

const requestAccessToken = async (
  clientId: string,
  clientSecret: string,
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<OAuth.TokenResponse> => {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  return await apiServer.fetchToken(params, "fetch tokens error:");
};

const refreshToken = async (
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<OAuth.TokenResponse> => {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const tokenResponse = await apiServer.fetchToken(params, "refresh tokens error:");

  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
};

export const authorize = async (): Promise<void> => {
  const { instance } = getPreferenceValues<Preference>();
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const { client_id, client_secret } = await apiServer.createApp();
      await client.setTokens(await refreshToken(client_id, client_secret, tokenSet.refreshToken));
    }
    return;
  }

  const { client_id, client_secret } = await apiServer.createApp();
  const authRequest = await client.authorizationRequest({
    endpoint: `https://${instance}/oauth/authorize`,
    clientId: client_id,
    scope: "read write",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await requestAccessToken(client_id, client_secret, authRequest, authorizationCode));

  const { fqn } = await apiServer.fetchAccountInfo();
  await LocalStorage.setItem("account-fqn", fqn);
};
