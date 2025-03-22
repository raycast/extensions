import { OAuth } from "@raycast/api";
import { URLSearchParams } from "url";
import fetch from "node-fetch";

const dbxClientID = "v02dx7xhu86xn09";
export const dbxAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Dropbox",
  providerIcon: "dropbox.png",
  description: "Connect your Dropbox account...",
});

export async function authorize(): Promise<OAuth.TokenSet | undefined> {
  const tokenSet = await dbxAuthClient.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await dbxAuthClient.setTokens(await refreshTokens(tokenSet.refreshToken));
      return dbxAuthClient.getTokens();
    }
    return tokenSet;
  }

  const authRequest = await dbxAuthClient.authorizationRequest({
    endpoint: "https://www.dropbox.com/oauth2/authorize",
    clientId: dbxClientID,
    scope: "account_info.read files.metadata.read",
    extraParameters: { token_access_type: "offline" },
  });
  const { authorizationCode } = await dbxAuthClient.authorize(authRequest);
  await dbxAuthClient.setTokens(await getTokens(authRequest, authorizationCode));
  return dbxAuthClient.getTokens();
}

async function getTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", dbxClientID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://www.dropbox.com/oauth2/token", { method: "POST", body: params });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", dbxClientID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://www.dropbox.com/oauth2/token", { method: "POST", body: params });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
