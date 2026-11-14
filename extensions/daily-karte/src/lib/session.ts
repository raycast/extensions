import type { ProviderOptions } from "@raycast/utils";
import { requestJSON } from "./http";
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

export function googleOptions(config: Config): ProviderOptions {
  return {
    clientId: config.clientId,
    scope: "openid email profile",
    providerId: `${config.projectId}:${config.clientId}`,
    providerName: "Daily Karte",
    description: "Sign in with the Google account you use for Daily Karte.",
    extraParameters: { access_type: "offline", prompt: "consent select_account" },
  };
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
