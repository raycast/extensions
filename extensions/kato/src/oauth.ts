import { environment, OAuth } from "@raycast/api";
import {
  KATO_OAUTH_CLIENT_ID,
  KATO_OAUTH_SCOPE,
  hasRequiredOAuthScopes,
  katoOAuthEndpoints,
} from "./oauth-config";

const { authorizeUrl: AUTHORIZE_URL, tokenUrl: TOKEN_URL } = katoOAuthEndpoints(
  environment.isDevelopment,
);

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Kato",
  providerIcon: "kato-ios-icon-transparent.png",
  description: "Connect Raycast to your Kato workspace",
});

class TokenRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "TokenRequestError";
  }
}

async function tokenRequest(
  body: URLSearchParams,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json().catch(() => null)) as
    | (OAuth.TokenResponse & { error?: string; error_description?: string })
    | null;
  if (!response.ok || !payload?.access_token) {
    const reason =
      payload?.error_description ??
      payload?.error ??
      "Kato did not return an access token";
    throw new TokenRequestError(
      environment.isDevelopment
        ? `${reason} (${response.status} from ${TOKEN_URL})`
        : reason,
      response.status,
      payload?.error,
    );
  }
  return payload;
}

export async function authorize(): Promise<string> {
  let tokens = await oauthClient.getTokens();
  if (tokens && !hasRequiredOAuthScopes(tokens.scope)) {
    await oauthClient.removeTokens();
    tokens = undefined;
  }
  if (tokens?.accessToken && !tokens.isExpired()) return tokens.accessToken;

  if (tokens?.refreshToken) {
    try {
      const refreshed = await tokenRequest(
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: KATO_OAUTH_CLIENT_ID,
          refresh_token: tokens.refreshToken,
        }),
      );
      await oauthClient.setTokens(refreshed);
      return refreshed.access_token;
    } catch (error) {
      // Only an explicit invalid_grant response rejects the refresh token.
      // Network, server, and token-storage failures must preserve credentials.
      if (
        !(error instanceof TokenRequestError) ||
        error.status !== 400 ||
        error.code !== "invalid_grant"
      ) {
        throw error;
      }
      await oauthClient.removeTokens();
      tokens = undefined;
    }
  }

  const request = await oauthClient.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId: KATO_OAUTH_CLIENT_ID,
    scope: KATO_OAUTH_SCOPE,
  });
  const { authorizationCode } = await oauthClient.authorize(request);
  const tokenResponse = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KATO_OAUTH_CLIENT_ID,
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
    }),
  );
  await oauthClient.setTokens(tokenResponse);
  return tokenResponse.access_token;
}

export async function switchWorkspace(): Promise<string> {
  await oauthClient.removeTokens();
  return authorize();
}

export const accessTokenOptions = { client: oauthClient, authorize };
