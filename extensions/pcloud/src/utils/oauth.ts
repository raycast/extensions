import fetch from "node-fetch";
import { getPreferenceValues, LocalStorage, OAuth } from "@raycast/api";
import { has } from "lodash";

const oauthConfig = {
  url: "https://raycast.aleflo.it",
  params: {
    client_id: "hQIu8GcQpUk",
    response_type: "code",
    redirect_uri: "https://raycast.com/redirect?packageName=Extension",
  },
};

export async function oauth({
  forceReauth = false,
  isEuropeRegion = false,
}: {
  forceReauth?: boolean;
  isEuropeRegion?: boolean;
}): Promise<string> {
  const preferenceToken = getPreferenceValues().pcloud_token;
  const server = isEuropeRegion ? "eu" : "us";

  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "pCloud",
    providerIcon: "pCloud-logo.png",
    description: "To perform fast searches, you also need to authorize access to the pCloud API",
  });
  // we are authorized with a token in the preference
  if (preferenceToken && !forceReauth) {
    return preferenceToken;
  }
  const token = await checkTokens(client).catch(console.error);

  if (token && !forceReauth) {
    return token;
  }

  const alreadyAuthorizing = new Promise<string>((resolve, reject) => {
    async function run() {
      const authRequest = await client.authorizationRequest({
        endpoint: `${oauthConfig.url}/authorize`,
        clientId: oauthConfig.params.client_id,
        extraParameters: {
          response_type: oauthConfig.params.response_type,
        },
        scope: "files.read",
      });
      const { authorizationCode } = await client.authorize(authRequest);
      //console.log({ authorizationCode, code_verifier: authRequest.codeVerifier });
      const tokenResponse = await fetchTokens(authRequest, authorizationCode, server);
      if (has(tokenResponse, "error")) {
        console.error("Error fetching tokens", tokenResponse);
        reject(new Error((tokenResponse as unknown as { code: string; error: string }).error));
      }
      //console.log({ tokenResponse });
      await client.setTokens(tokenResponse);
      return tokenResponse.access_token;
    }

    run().then(resolve, reject);
  });
  return await alreadyAuthorizing;
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
  server: "eu" | "us"
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", oauthConfig.params.client_id);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("scope", "files.read");
  params.append("server", server);

  //console.log("fetch tokens", params.toString());

  const response = await fetch(`${oauthConfig.url}/token`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    //convert params to json
    body: JSON.stringify(Object.fromEntries(params)),
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    console.error("more info->", response);
    throw new Error(response.statusText);
  }
  const res = (await response.json()) as OAuth.TokenResponse;
  //console.log("fetch tokens response", res);
  return res;
}

export async function checkTokens(client: OAuth.PKCEClient) {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokenSet = await refreshTokens(tokenSet.refreshToken);
      await client.setTokens(newTokenSet);
      await LocalStorage.setItem("pcloud_token", tokenSet?.accessToken || "");
      return newTokenSet.access_token;
    } else {
      await LocalStorage.setItem("pcloud_token", tokenSet?.accessToken || "");
    }
    return tokenSet?.accessToken;
  }
  return null;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", oauthConfig.params.client_id);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");
  params.append("scope", "files.read");

  const response = await fetch(`${oauthConfig.url}/token`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
