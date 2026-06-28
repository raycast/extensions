import { OAuth } from "@raycast/api";

const APP_URL = "https://app.keeply.tools";
const API_URL = "https://api.keeply.tools";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Keeply",
  providerIcon: "keeply-icon.png",
  description: "Connect your Keeply account to access your bookmarks.",
});

export async function authorize(): Promise<string> {
  const existingTokens = await oauthClient.getTokens();
  if (existingTokens?.accessToken && !existingTokens.isExpired()) {
    return existingTokens.accessToken;
  }

  if (existingTokens?.refreshToken) {
    try {
      const tokenSet = await refreshTokens(existingTokens.refreshToken);
      await oauthClient.setTokens(tokenSet);
      return tokenSet.access_token;
    } catch {
      // Fall through to full PKCE flow
    }
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${APP_URL}/oauth/authorize`,
    clientId: "raycast",
    scope:
      "read_bookmarks create_bookmark update_bookmark delete_bookmark search_bookmarks read_folders read_tags write_tags",
    extraParameters: { code_challenge_method: "S256" },
  });

  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokenSet = await fetchTokens(authRequest, authorizationCode);
  await oauthClient.setTokens(tokenSet);

  return tokenSet.access_token;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, code: string): Promise<OAuth.TokenResponse> {
  const res = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      codeVerifier: authRequest.codeVerifier,
      clientId: "raycast",
    }),
  });

  return parseTokenResponse(res);
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const res = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      clientId: "raycast",
    }),
  });

  return parseTokenResponse(res);
}

async function parseTokenResponse(res: Response): Promise<OAuth.TokenResponse> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Authentication failed (${res.status})`);
  }

  const data = (await res.json()) as {
    accessToken?: string;
    access_token?: string;
    expiresIn?: number;
    expires_in?: number;
    refreshToken?: string;
    refresh_token?: string;
  };

  const accessToken = data.accessToken ?? data.access_token;
  if (!accessToken) {
    throw new Error("Authentication response missing access token");
  }

  const expiresIn = data.expiresIn ?? data.expires_in;
  const refreshToken = data.refreshToken ?? data.refresh_token;

  return {
    access_token: accessToken,
    ...(expiresIn != null ? { expires_in: expiresIn } : {}),
    ...(refreshToken != null ? { refresh_token: refreshToken } : {}),
  };
}
