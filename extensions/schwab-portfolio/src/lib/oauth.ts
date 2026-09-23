import { OAuth, getPreferenceValues } from "@raycast/api";
import { SCHWAB_AUTH_URL, SCHWAB_TOKEN_URL } from "./constants";

function getCredentials(): { clientId: string; clientSecret: string } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    clientId: (prefs.schwabAppKey ?? "").trim(),
    clientSecret: (prefs.schwabAppSecret ?? "").trim(),
  };
}

export function hasSchwabCredentials(): boolean {
  const { clientId, clientSecret } = getCredentials();
  return Boolean(clientId && clientSecret);
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Charles Schwab",
  providerIcon: "schwab-logo.png",
  description: "Connect your Charles Schwab account to view your portfolio",
});

function basicAuth(clientId: string, clientSecret: string): string {
  if (!clientId || !clientSecret) {
    throw new Error("Missing Schwab App Key/Secret. Set them in the extension preferences and try again.");
  }
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function exchangeToken(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
  credentials: { clientId: string; clientSecret: string },
): Promise<OAuth.TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: credentials.clientId,
    code: authCode,
    code_verifier: authRequest.codeVerifier,
    redirect_uri: authRequest.redirectURI,
  });

  const response = await fetch(SCHWAB_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(credentials.clientId, credentials.clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const tokens = (await response.json()) as OAuth.TokenResponse;
  tokens.scope = tokens.scope ?? "readonly";
  return tokens;
}

async function refreshToken(
  token: OAuth.TokenSet,
  credentials: { clientId: string; clientSecret: string },
): Promise<OAuth.TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: credentials.clientId,
    refresh_token: token.refreshToken ?? "",
  });

  const response = await fetch(SCHWAB_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(credentials.clientId, credentials.clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
  }

  const tokens = (await response.json()) as OAuth.TokenResponse;
  tokens.scope = tokens.scope ?? "readonly";
  return tokens;
}

export const schwabOAuth = {
  client,
  authorize: async (): Promise<string> => {
    const credentials = getCredentials();
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error("Missing Schwab App Key/Secret. Set them in the extension preferences and try again.");
    }

    const currentTokenSet = await client.getTokens();
    if (currentTokenSet?.accessToken) {
      if (currentTokenSet.refreshToken && currentTokenSet.isExpired()) {
        try {
          const refreshed = await refreshToken(currentTokenSet, credentials);
          await client.setTokens({
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token ?? currentTokenSet.refreshToken,
            expiresIn: refreshed.expires_in,
            scope: refreshed.scope,
            idToken: refreshed.id_token,
          });
          return refreshed.access_token;
        } catch {
          await client.removeTokens();
        }
      }
      if (!currentTokenSet.isExpired()) {
        return currentTokenSet.accessToken;
      }

      // Expired access token without refresh token — force re-auth.
      await client.removeTokens();
    }

    const authRequest = await client.authorizationRequest({
      endpoint: SCHWAB_AUTH_URL,
      clientId: credentials.clientId,
      scope: "readonly",
    });
    const { authorizationCode } = await client.authorize(authRequest);
    const exchanged = await exchangeToken(authRequest, authorizationCode, credentials);
    await client.setTokens({
      accessToken: exchanged.access_token,
      refreshToken: exchanged.refresh_token,
      expiresIn: exchanged.expires_in,
      scope: exchanged.scope,
      idToken: exchanged.id_token,
    });
    return exchanged.access_token;
  },
};
