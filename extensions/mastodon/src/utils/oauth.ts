import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import apiServer from "./api";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Mastodon",
  providerIcon: "mastodon-icon.png",
  providerId: "mastodon",
  description: "Connect to your Mastodon acount",
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

  return await apiServer.fetchToken(params);
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

  const tokenResponse = await apiServer.fetchToken(params);

  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
};

const authorize = async (): Promise<string> => {
  const { instance }: Preferences = getPreferenceValues();

  if (!instance) {
    throw new Error("instance is required");
  }

  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const { client_id, client_secret } = await apiServer.createApp();
      await client.setTokens(await refreshToken(client_id, client_secret, tokenSet.refreshToken));
    }
    const { username } = await apiServer.fetchAccountInfo();
    return username;
  }

  const { client_id, client_secret } = await apiServer.createApp();
  const authRequest = await client.authorizationRequest({
    endpoint: `https://${instance}/oauth/authorize`,
    clientId: client_id,
    scope: "read:statuses write:statuses read:bookmarks read:accounts write:media",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await requestAccessToken(client_id, client_secret, authRequest, authorizationCode));

  const { username } = await apiServer.fetchAccountInfo();
  await LocalStorage.setItem("account-username", username);
  return username;
};

async function getValidTokens(): Promise<OAuth.TokenSet> {
  const tokenSet = await client.getTokens();

  if (!tokenSet || !tokenSet.accessToken) {
    const username = await authorize();
    const updatedTokenSet = await client.getTokens();
    if (updatedTokenSet && updatedTokenSet.accessToken) {
      await LocalStorage.setItem("account-username", username);
      return updatedTokenSet;
    } else {
      throw new Error("Failed to get valid access token");
    }
  }

  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    const { client_id, client_secret } = await apiServer.createApp();
    const refreshedTokens = await refreshToken(client_id, client_secret, tokenSet.refreshToken);
    await client.setTokens(refreshedTokens);
    const updatedTokenSet = await client.getTokens();
    if (updatedTokenSet && updatedTokenSet.accessToken) {
      return updatedTokenSet;
    } else {
      throw new Error("Failed to refresh access token");
    }
  }

  return tokenSet;
}

export async function getAccessToken(): Promise<string> {
  const validTokenSet = await getValidTokens();
  if (validTokenSet && validTokenSet.accessToken) {
    return validTokenSet.accessToken;
  } else {
    throw new Error("Failed to get valid access token");
  }
}
