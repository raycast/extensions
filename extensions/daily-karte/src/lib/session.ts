import type { OAuth } from "@raycast/api";
import { requestJSON, ServiceError } from "./http";
import type { Config, Session } from "../types";

export function readConfig(application: { projectId: string; clientId: string }): Config {
  const projectId = application.projectId.trim();
  const clientId = application.clientId.trim();
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
    throw new Error("Google sign-in is temporarily unavailable. Please try again later.");
  }
  if (!/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new Error("Google sign-in is temporarily unavailable. Please try again later.");
  }
  return { projectId, clientId, website: `https://${projectId}.web.app` };
}

type OAuthClient = Pick<
  OAuth.PKCEClient,
  "getTokens" | "setTokens" | "removeTokens" | "authorizationRequest" | "authorize"
>;

export async function authorizeGoogle(client: OAuthClient, clientId: string, request = requestJSON): Promise<string> {
  const saved = await client.getTokens();
  if (saved?.accessToken && !saved.isExpired()) return saved.accessToken;
  if (saved?.refreshToken) {
    try {
      const refreshed = await request<OAuth.TokenResponse>("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: clientId,
          refresh_token: saved.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!refreshed.access_token) throw new Error("Google did not return a sign-in session.");
      await client.setTokens({
        ...refreshed,
        refresh_token: refreshed.refresh_token ?? saved.refreshToken,
      });
      return refreshed.access_token;
    } catch (error) {
      if (!(error instanceof ServiceError) || error.code !== "invalid_grant") throw error;
      await client.removeTokens();
    }
  }
  const auth = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId,
    scope: "openid email profile",
    extraParameters: {
      access_type: "offline",
      prompt: "consent select_account",
    },
  });
  const { authorizationCode } = await client.authorize(auth);
  const response = await request<OAuth.TokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      code: authorizationCode,
      code_verifier: auth.codeVerifier,
      redirect_uri: auth.redirectURI,
      grant_type: "authorization_code",
    }),
  });
  if (!response.access_token) throw new Error("Google did not return a sign-in session.");
  await client.setTokens(response);
  return response.access_token;
}

export async function firebaseSession(
  config: Config,
  googleAccessToken: string,
  request = requestJSON,
): Promise<Session> {
  const firebase = await request<{ projectId?: string; apiKey?: string }>(`${config.website}/__/firebase/init.json`);
  if (firebase.projectId !== config.projectId || typeof firebase.apiKey !== "string" || !firebase.apiKey) {
    throw new Error("The website's Firebase configuration does not match this project.");
  }
  const response = await request<{
    localId?: string;
    idToken?: string;
    email?: string;
    expiresIn?: string;
    needConfirmation?: boolean;
  }>(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(firebase.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestUri: config.website,
      postBody: new URLSearchParams({
        access_token: googleAccessToken,
        providerId: "google.com",
      }).toString(),
      returnSecureToken: true,
    }),
  });
  if (response.needConfirmation)
    throw new Error("Please sign in with the Google account already linked to Daily Karte.");
  if (
    typeof response.localId !== "string" ||
    !response.localId ||
    typeof response.idToken !== "string" ||
    !response.idToken ||
    /[/.]/.test(response.localId) ||
    !Number.isFinite(Number(response.expiresIn)) ||
    Number(response.expiresIn) <= 0
  ) {
    throw new Error("Firebase did not return a valid sign-in session.");
  }
  return {
    config,
    uid: response.localId,
    email: typeof response.email === "string" ? response.email : "Your Daily Karte account",
    idToken: response.idToken,
    expiresAt: Date.now() + Number(response.expiresIn) * 1000,
  };
}
