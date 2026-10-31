// Raycast's half of the shared OAuth session (ops/extensions/shared/src/session.ts):
// Raycast's PKCE client runs the browser step and keeps the tokens, and its
// LocalStorage holds the client id, email and connection epoch.
import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { createSession } from "../vendor/twelfth-shared/index";
import { ENDPOINTS, REDIRECT_URI } from "./config";

export { AuthError, NotSignedInError } from "../vendor/twelfth-shared/index";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Twelfth",
  providerIcon: "icon.png",
  providerId: "twelfth",
  description: "Connect Raycast to your Twelfth workspace. You'll choose the workspace on the next page.",
});

export function apiKey(): string | undefined {
  const { apiKey } = getPreferenceValues<Preferences>();
  return apiKey?.trim() || undefined;
}

export const session = createSession({
  endpoints: ENDPOINTS,
  client: { name: "Raycast", uri: "https://www.raycast.com", redirectUri: REDIRECT_URI },
  storage: LocalStorage,
  apiKey,
  tokens: {
    async get() {
      const tokens = await client.getTokens();
      if (!tokens?.accessToken) return undefined;
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expired: tokens.isExpired() };
    },
    set: (tokens) => client.setTokens(tokens),
    remove: () => client.removeTokens(),
  },
  async authorize({ authorizeUrl, clientId, scope, resource }) {
    const request = await client.authorizationRequest({
      endpoint: authorizeUrl,
      clientId,
      scope,
      extraParameters: { resource },
    });
    const { authorizationCode } = await client.authorize(request);
    return { code: authorizationCode, codeVerifier: request.codeVerifier, redirectUri: request.redirectURI };
  },
});

export const { authorize, connectionEpoch, forceRefresh, reconnect, signOut, signedInEmail, storedToken } = session;
