import { OAuth, getPreferenceValues } from "@raycast/api";

const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function requirePreference(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in Raycast extension preferences.`,
    );
  }
  return value;
}

export const googleOAuth = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Google",
  providerIcon: "google.png",
  providerId: "google",
  description: "Connect your Google account to TaskCast",
});

async function exchangeAuthorizationCode(
  authRequest: OAuth.AuthorizationRequest,
  authorizationCode: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("code", authorizationCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Error while fetching tokens: ${response.status} (${response.statusText})\n${text}`,
    );
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    await googleOAuth.removeTokens();
    throw new Error("Session expired. Please sign in to Google again.");
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function getAccessToken(): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const clientId = requirePreference(
    "googleClientId",
    preferences.googleClientId,
  );
  const clientSecret = requirePreference(
    "googleClientSecret",
    preferences.googleClientSecret,
  );
  const currentTokenSet = await googleOAuth.getTokens();

  if (currentTokenSet?.accessToken) {
    if (currentTokenSet.refreshToken && currentTokenSet.isExpired()) {
      try {
        const refreshed = await refreshAccessToken(
          currentTokenSet.refreshToken,
          clientId,
          clientSecret,
        );
        await googleOAuth.setTokens(refreshed);
        return refreshed.access_token;
      } catch {
        // Fall through to a fresh authorization flow.
      }
    }

    if (!currentTokenSet.isExpired()) {
      return currentTokenSet.accessToken;
    }
  }

  const authRequest = await googleOAuth.authorizationRequest({
    endpoint: GOOGLE_AUTHORIZE_URL,
    clientId,
    scope: GOOGLE_TASKS_SCOPE,
    extraParameters: {
      access_type: "offline",
      prompt: "consent",
    },
  });

  const { authorizationCode } = await googleOAuth.authorize(authRequest);
  const tokens = await exchangeAuthorizationCode(
    authRequest,
    authorizationCode,
    clientId,
    clientSecret,
  );
  await googleOAuth.setTokens(tokens);
  return tokens.access_token;
}
