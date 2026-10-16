import { environment, LocalStorage, OAuth } from "@raycast/api";
import { join } from "path";
import { fileLock } from "./keito/lock";
import { KEITO_OAUTH, KeitoOAuth, StoredTokens, TokenStore } from "./keito/oauth";
import { SESSION_KEY } from "./keito/session";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Keito",
  providerIcon: "keito-icon-5046e5.png",
  providerId: "keito",
  description: "Sign in to Keito to track time from Raycast.",
});

/** Raycast's encrypted token storage. Expiry is stored as expires_in relative to the save time. */
const tokenStore: TokenStore = {
  async get(): Promise<StoredTokens | undefined> {
    const tokens = await client.getTokens();
    if (!tokens?.accessToken) return undefined;
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
      expiresAt: tokens.expiresIn ? new Date(tokens.updatedAt).getTime() + tokens.expiresIn * 1000 : undefined,
    };
  },
  async set(tokens: StoredTokens) {
    await client.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
      expiresIn: tokens.expiresAt ? Math.max(1, Math.round((tokens.expiresAt - Date.now()) / 1000)) : undefined,
    });
  },
  remove: () => client.removeTokens(),
};

export const keitoOAuth = new KeitoOAuth({
  store: tokenStore,
  authorizer: {
    async authorize({ nonce }) {
      const request = await client.authorizationRequest({
        endpoint: KEITO_OAUTH.authorizeUrl,
        clientId: KEITO_OAUTH.clientId,
        scope: KEITO_OAUTH.scope,
        extraParameters: { nonce },
      });
      const { authorizationCode } = await client.authorize(request);
      return { code: authorizationCode, codeVerifier: request.codeVerifier, redirectUri: request.redirectURI };
    },
  },
  // Commands run in separate processes; refresh-token rotation must not race between them.
  lock: fileLock(join(environment.supportPath, "oauth-refresh.lock")),
  // A new sign-in may be a different person or company, so verify the identity again.
  onSignIn: () => LocalStorage.removeItem(SESSION_KEY),
});
