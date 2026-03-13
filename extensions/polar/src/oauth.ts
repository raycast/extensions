import { getPreferenceValues, OAuth } from "@raycast/api";

const CLIENT_ID = "polar_ci_emNfLiLOhk0njeLomDs14g";

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://api.polar.sh/v1/oauth2/token", {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(
  refreshToken: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", "YourClientId");
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://api.polar.sh/v1/oauth2/token", {
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

export const authenticate = async (): Promise<string> => {
  const { access_token } = getPreferenceValues<Preferences>();
  if (access_token) return access_token;

  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Polar",
    providerIcon: "command-icon.png",
    description: "Connect your Polar account…",
  });

  const authRequest = await client.authorizationRequest({
    endpoint: "https://polar.sh/oauth2/authorize",
    clientId: CLIENT_ID,
    scope:
      "openid profile email user:read organizations:read organizations:write products:read products:write benefits:read benefits:write subscriptions:read subscriptions:write orders:read metrics:read",
  });

  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      let tokenResponse: OAuth.TokenResponse;

      try {
        tokenResponse = await refreshTokens(tokenSet.refreshToken);
        await client.setTokens(tokenResponse);

        if (tokenResponse.access_token) {
          return tokenResponse.access_token;
        }
      } catch (error) {
        console.error("refresh tokens error:", error);
        client.removeTokens();
      }
    }

    return tokenSet.accessToken;
  }

  const { authorizationCode } = await client.authorize(authRequest);

  const tokenResponse = await fetchTokens(authRequest, authorizationCode);

  await client.setTokens(tokenResponse);

  return tokenResponse.access_token;
};
