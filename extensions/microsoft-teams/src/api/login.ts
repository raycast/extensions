import fetch, { FormData } from "node-fetch";
import { OAuth } from "@raycast/api";
import { prefs } from "./preferences";
import { cacheCurrentUserId } from "./user";

const scope = "offline_access user.read User.Read.All Presence.ReadWrite Chat.Read Presence.Read.All";
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

interface MicrosoftTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function login(): Promise<string> {
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
  return requestTokens({ grantType: "authorization_code", authRequest, authorizationCode });
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
  const tokenResponse = (await response.json()) as MicrosoftTokenResponse;
  if (!response.ok) {
    if (tokenResponse.error_description?.includes("AADSTS7000218")) {
      throw new Error(
        "Microsoft app registration is configured as a confidential client. In Azure Portal, set Authentication -> Platform to 'Mobile and desktop applications' with redirect URI 'https://raycast.com/redirect?packageName=Extension' and enable 'Allow public client flows'."
      );
    }
    throw new Error(
      tokenResponse.error_description ?? tokenResponse.error ?? `Token request failed with status ${response.status}`
    );
  }

  if (!tokenResponse.access_token) {
    throw new Error("Token request succeeded but access_token is missing");
  }

  const tokenSet: OAuth.TokenResponse = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    id_token: tokenResponse.id_token,
    scope: tokenResponse.scope,
    expires_in: tokenResponse.expires_in,
  };

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
