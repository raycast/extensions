import fetch, { FormData } from "node-fetch";
import { OAuth } from "@raycast/api";
import { prefs } from "./preferences";
import { cacheCurrentUserId } from "./user";

const scope = "offline_access user.read Presence.ReadWrite Chat.Read Presence.Read.All";
const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Microsoft",
  providerIcon: "microsoft.png",
  description: "Connect your Microsoft account …",
});

export const graphClient = {
  accessToken,
  refreshToken,
};

interface RequestTokenWithCode {
  grantType: "authorization_code";
  authRequest: OAuth.AuthorizationRequest;
  authorizationCode: string;
}

interface RequestTokenWithRefreshToken {
  grantType: "refresh_token";
  refreshToken: string;
}

async function login(): Promise<string> {
  console.log("oauthLogin");
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `https://login.microsoftonline.com/${prefs.tenantId}/oauth2/v2.0/authorize`,
    clientId: prefs.clientId,
    scope,
    extraParameters: {
      response_type: "code",
      redirect_uri: "https://raycast.com/redirect?packageName=Extension",
      response_mode: "query",
    },
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  console.log(authorizationCode);
  return requestTokens({ grantType: "authorization_code", authRequest, authorizationCode });
}

interface RequestTokenWithCode {
  grantType: "authorization_code";
  authRequest: OAuth.AuthorizationRequest;
  authorizationCode: string;
}

interface RequestTokenWithRefreshToken {
  grantType: "refresh_token";
  refreshToken: string;
}

async function requestTokens(options: RequestTokenWithCode | RequestTokenWithRefreshToken): Promise<string> {
  console.log(`requesting token using grantType ${options.grantType}`);
  const url = `https://login.microsoftonline.com/${prefs.tenantId}/oauth2/v2.0/token`;
  const form = new FormData();
  form.append("grant_type", options.grantType);
  form.append("client_id", prefs.clientId);
  if (options.grantType === "authorization_code") {
    form.append("code", options.authorizationCode);
    form.append("code_verifier", options.authRequest.codeVerifier);
    form.append("redirect_uri", options.authRequest.redirectURI);
    form.append("scope", scope);
  } else {
    form.append("refresh_token", options.refreshToken);
  }
  const response = await fetch(url, {
    method: "POST",
    body: form,
  });
  const tokenSet = (await response.json()) as OAuth.TokenResponse;
  console.log(tokenSet);
  await oauthClient.setTokens(tokenSet);
  await cacheCurrentUserId();
  return tokenSet.access_token;
}

async function accessToken(refresh?: boolean): Promise<string> {
  const tokenSet = await oauthClient.getTokens();
  if (!refresh && tokenSet?.accessToken && !tokenSet.isExpired()) {
    return tokenSet.accessToken;
  } else if (tokenSet?.refreshToken) {
    return requestTokens({ grantType: "refresh_token", refreshToken: tokenSet.refreshToken });
  } else {
    return login();
  }
}

async function refreshToken(): Promise<string> {
  return accessToken(true);
}
