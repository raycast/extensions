import { OAuth } from "@raycast/api";
import AuthStore from "./store";
import API from "../api/base";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Vixai",
  providerIcon: "extension-icon.png",
  providerId: "google",
  description: "Login with Google",
});

const GOOGLE_CLIENT_ID = "683830017748-42ie1qohoi36vp2h37i9n2a9trd6tf6l.apps.googleusercontent.com";

export const provider = {
  client,
  authorize: async () => {
    // First, check if we have existing tokens
    const currentTokenSet = await client.getTokens();

    if (currentTokenSet?.accessToken) {
      if (!currentTokenSet.isExpired()) {
        const accessToken = await AuthStore.getAccessToken();
        if (accessToken) {
          return accessToken;
        }
        return await login(currentTokenSet.idToken || "");
      }

      if (currentTokenSet.refreshToken) {
        try {
          const tokens = await refreshTokens(currentTokenSet.refreshToken);
          await client.setTokens(tokens);
          return await login(tokens.id_token || "");
        } catch (error) {
          await client.removeTokens();
          // If refresh fails, throw error to trigger re-authorization
          throw error;
        }
      }
    }

    // If not, start the authorization flow
    const authRequest = await client.authorizationRequest({
      endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      clientId: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    });

    const { authorizationCode } = await client.authorize(authRequest);
    const tokens = await fetchTokens(authRequest, authorizationCode);
    await client.setTokens(tokens);
    return login(tokens.id_token || "");
  },

  signOut: async () => {
    await client.removeTokens();
    await AuthStore.removeAccessToken();
  },
};

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", GOOGLE_CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("fetch tokens error:", responseText);
    throw new Error(`Error while fetching tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  return tokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", GOOGLE_CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("refresh tokens error:", responseText);
    // If refresh fails, throw error to trigger re-authorization
    throw new Error(`Error while refreshing tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

type LoginResponse = {
  access_token: string;
  id: string;
};

async function login(googleIdToken: string): Promise<string> {
  try {
    const res = await API.post<LoginResponse>("auth/login", {
      provider: "google",
      data: {
        id_token: googleIdToken,
      },
    });

    if (!res.access_token) {
      throw new Error("error logging in");
    }
    await AuthStore.setAccessToken(res.access_token);
    return res.access_token;
  } catch (error) {
    await client.removeTokens();
    console.error(error);
    throw new Error("error logging in");
  }
}
