import { OAuth } from "@raycast/api";
import { AuthSession, type TokenStore } from "./auth";
import {
  pollDeviceToken,
  refreshAccessToken,
  revokeToken,
  startDeviceAuthorization,
} from "./oauth-protocol";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "EveryAPI",
  providerIcon: "icon.png",
  providerId: "everyapi",
  description: "Sign in to use your EveryAPI account in Raycast.",
});

const store: TokenStore = {
  getTokens: () => client.getTokens(),
  setTokens: (tokens) =>
    client.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      scope: tokens.scope,
    }),
  removeTokens: () => client.removeTokens(),
};

const sessions = new Map<string, AuthSession>();

export function createRaycastAuthSession(apiBase: string): AuthSession {
  const existing = sessions.get(apiBase);
  if (existing) return existing;
  const session = new AuthSession({
    store,
    start: () => startDeviceAuthorization(apiBase),
    poll: (authorization) => pollDeviceToken(apiBase, authorization),
    refresh: (refreshToken) => refreshAccessToken(apiBase, refreshToken),
    revoke: (token) => revokeToken(apiBase, token),
  });
  sessions.set(apiBase, session);
  return session;
}
