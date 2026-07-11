import fetch, { FormData } from "node-fetch";
import { OAuth } from "@raycast/api";
import { log } from "../util/log";
import { prefs } from "./preferences";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Salesforce",
  providerIcon: "salesforce.png",
  description: "Connect your Salesforce account …",
});

export const salesfoceClient = {
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

async function requestTokens(options: RequestTokenWithCode | RequestTokenWithRefreshToken): Promise<string> {
  log(`requesting token using grantType ${options.grantType}`);
  const url = `https://login.salesforce.com/services/oauth2/token`;
  const form = new FormData();
  form.append("grant_type", options.grantType);
  form.append("client_id", prefs.clientId);
  if (options.grantType === "authorization_code") {
    form.append("code", options.authorizationCode);
    form.append("code_verifier", options.authRequest.codeVerifier);
    form.append("redirect_uri", options.authRequest.redirectURI);
  } else {
    form.append("refresh_token", options.refreshToken);
  }
  const response = await fetch(url, {
    method: "POST",
    body: form,
  });
  const tokenSet = (await response.json()) as OAuth.TokenResponse;
  log(tokenSet);
  await oauthClient.setTokens(tokenSet);
  return tokenSet.access_token;
}

async function login(): Promise<string> {
  log("oauthLogin");
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `https://${prefs.domain}.my.salesforce.com/services/oauth2/authorize`,
    clientId: prefs.clientId,
    scope: "refresh_token api",
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  return requestTokens({ grantType: "authorization_code", authRequest, authorizationCode });
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
