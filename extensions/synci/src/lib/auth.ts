import { OAuth } from "@raycast/api";
import { ENVIRONMENT, OAUTH_CLIENT_ID, OAUTH_SCOPES, OAUTH_URL } from "./config";
import { OAuthSession } from "./oauth-session";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Synci",
  providerId: `synci-${ENVIRONMENT}-${OAUTH_CLIENT_ID}`,
  providerIcon: "synci-mark.png",
  description: "Connect Synci to view your finances and ask questions through Raycast AI.",
});

export const session = new OAuthSession(
  {
    getTokens: () => client.getTokens(),
    setTokens: (tokens) => client.setTokens(tokens),
    removeTokens: () => client.removeTokens(),
    async authorize(forceConsent = false) {
      const request = await client.authorizationRequest({
        endpoint: `${OAUTH_URL}/authorize`,
        clientId: OAUTH_CLIENT_ID,
        scope: OAUTH_SCOPES,
        extraParameters: forceConsent ? { prompt: "consent" } : undefined,
      });
      const { authorizationCode } = await client.authorize(request);
      return { code: authorizationCode, verifier: request.codeVerifier, redirect: request.redirectURI };
    },
  },
  OAUTH_CLIENT_ID,
  `${OAUTH_URL}/token`,
);
