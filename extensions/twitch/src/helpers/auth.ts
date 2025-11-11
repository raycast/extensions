import { getPreferenceValues, OAuth } from "@raycast/api";
import fetch from "node-fetch";

const preferences = getPreferenceValues<Preferences.Live | Preferences.Following>();

const AUTH_URL = "https://twitch.oauth.raycast.com/authorize";
const TOKEN_URL = "https://twitch.oauth.raycast.com/token";
const REFRESH_URL = "https://twitch.oauth.raycast.com/refresh-token";
const CLIENT_ID = "2seilcmdzzph88cijp963sbm9485bo";
const IS_DEPRECATED_AUTH = preferences.clientId && preferences.authorization;

let runningAuthPromise: Promise<string> | undefined;

export async function getHeaders() {
  if (IS_DEPRECATED_AUTH) {
    return {
      "Client-Id": preferences.clientId,
      Authorization: `Bearer ${preferences.authorization}`,
    } as const;
  }

  const promise = (runningAuthPromise ??= authorize());
  promise.then(() => {
    if (runningAuthPromise === promise) runningAuthPromise = undefined;
  });
  const accessToken = await promise;
  const headers = {
    "Client-Id": CLIENT_ID,
    Authorization: `Bearer ${accessToken}`,
  } as const;
  return headers;
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Twitch",
  providerIcon: "TwitchGlitchPurple.png",
  description: "Connect your Twitch account…",
  providerId: "twitch",
});

// Authorization

async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokenSet = await refreshTokens(tokenSet.refreshToken);
      await client.setTokens(newTokenSet);
      return newTokenSet.access_token;
    }
    return tokenSet.accessToken;
  }
  const authRequest = await client.authorizationRequest({
    endpoint: AUTH_URL,
    clientId: CLIENT_ID,
    scope: "user:read:follows",
    extraParameters: {
      response_type: "code",
    },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const newTokenSet = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(newTokenSet);
  return newTokenSet.access_token;
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authorizationCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: JSON.stringify({
      client_id: CLIENT_ID,
      code: authorizationCode,
      device_code: authorizationCode,
      scope: "user:read:follows",
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    try {
      const data = await response.json();
      console.error(data);
    } catch {
      /**/
    }
    throw new Error(response.statusText);
  }
  const data = (await response.json()) as OAuth.TokenResponse;
  return {
    ...data,
    scope: (data.scope as unknown as string[]).join(" "),
  };
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch(REFRESH_URL, {
    method: "POST",
    body: JSON.stringify({
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    try {
      const data = await response.json();
      console.error(data);
    } catch {
      /**/
    }
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  tokenResponse.scope = Array.isArray(tokenResponse.scope) ? tokenResponse.scope.join(" ") : tokenResponse.scope;
  return tokenResponse;
}
