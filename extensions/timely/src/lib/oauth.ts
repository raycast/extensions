import { getPreferenceValues, OAuth, showToast, Toast } from "@raycast/api";

const TIMELY_AUTHORIZE_URL = "https://api.timelyapp.com/1.1/oauth/authorize";
const TIMELY_TOKEN_URL = "https://api.timelyapp.com/1.1/oauth/token";

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Timely",
  providerIcon: "extension-icon.png",
  description: "Connect your Timely account to list and create projects.",
});

function getOAuthCredentials(): { clientId: string; clientSecret: string } {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.clientId?.trim() || !prefs.clientSecret?.trim()) {
    throw new Error("Missing Client ID or Client Secret. Add them in Raycast Preferences.");
  }
  return { clientId: prefs.clientId.trim(), clientSecret: prefs.clientSecret.trim() };
}

export async function authorizeWithTimely(): Promise<string> {
  const { clientId } = getOAuthCredentials();

  // Create auth request - this gives us the redirect URI that Raycast expects
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: TIMELY_AUTHORIZE_URL,
    clientId,
    scope: "",
  });

  // Build URL without PKCE params (Timely doesn't support PKCE)
  const customUrl = [
    TIMELY_AUTHORIZE_URL,
    "?response_type=code",
    "&redirect_uri=" + encodeURIComponent(authRequest.redirectURI),
    "&client_id=" + encodeURIComponent(clientId),
    "&state=" + encodeURIComponent(authRequest.state),
  ].join("");

  const { authorizationCode } = await oauthClient.authorize({
    url: customUrl,
  });

  const { clientSecret } = getOAuthCredentials();

  const params = new URLSearchParams();
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("code", authorizationCode);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "authorization_code");

  const response = await fetch(TIMELY_TOKEN_URL, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  await oauthClient.setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  });

  await showToast({ style: Toast.Style.Success, title: "Connected to Timely" });

  return data.access_token;
}

export async function getAccessToken(): Promise<string> {
  const tokens = await oauthClient.getTokens();

  if (tokens?.accessToken) {
    // If token is expired and we have a refresh token, try to refresh
    if (tokens.refreshToken && tokens.isExpired()) {
      try {
        const newTokens = await refreshTokens(tokens.refreshToken);
        return newTokens.accessToken;
      } catch {
        // Refresh failed, re-authorize
        return authorizeWithTimely();
      }
    }
    return tokens.accessToken;
  }

  return authorizeWithTimely();
}

async function refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
  const { clientId, clientSecret } = getOAuthCredentials();

  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "refresh_token");

  const response = await fetch(TIMELY_TOKEN_URL, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  await oauthClient.setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  });

  return { accessToken: data.access_token };
}
