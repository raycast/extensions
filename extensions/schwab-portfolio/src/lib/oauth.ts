import { OAuth, getPreferenceValues } from "@raycast/api";
import { SCHWAB_AUTH_URL, SCHWAB_TOKEN_URL } from "./constants";

function getCredentials(): { clientId: string; clientSecret: string } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    clientId: (prefs.schwabAppKey ?? "").trim(),
    clientSecret: (prefs.schwabAppSecret ?? "").trim(),
  };
}

export function getCredentialStatus() {
  const { clientId, clientSecret } = getCredentials();
  return { hasAppKey: Boolean(clientId), hasAppSecret: Boolean(clientSecret) };
}

export function hasSchwabCredentials(): boolean {
  const { clientId, clientSecret } = getCredentials();
  return Boolean(clientId && clientSecret);
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Charles Schwab",
  providerIcon: "schwab-logo.png",
  description:
    "Sign in to Charles Schwab. Your saved App Key and Secret stay in Raycast; weekly sign-in does not require developer setup.",
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
    throw await tokenError(response);
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
    throw await tokenError(response);
  }

  const tokens = (await response.json()) as OAuth.TokenResponse;
  tokens.scope = tokens.scope ?? "readonly";
  return tokens;
}

class TokenError extends Error {
  constructor(
    message: string,
    readonly expiredGrant: boolean,
  ) {
    super(message);
  }
}

async function tokenError(response: Response): Promise<TokenError> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  const expiredGrant = response.status === 400 && payload?.error === "invalid_grant";
  const invalidClient = payload?.error === "invalid_client";
  return new TokenError(
    expiredGrant
      ? "Your Schwab sign-in expired. Sign in again using your saved app credentials."
      : invalidClient
        ? "Schwab rejected the saved App Key or Secret. Check them in extension preferences."
        : `Schwab sign-in is temporarily unavailable (${response.status}). Try again; your saved connection has been kept.`,
    expiredGrant,
  );
}

async function authorize(rejectedAccessToken?: string, signIn = false): Promise<string> {
  const credentials = getCredentials();
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error("Missing Schwab App Key/Secret. Set them once in extension preferences and try again.");
  }

  const current = await client.getTokens();
  if (!signIn && current?.accessToken) {
    const rejected = current.accessToken === rejectedAccessToken;
    if (!current.isExpired() && !rejected) return current.accessToken;
    if (current.refreshToken) {
      try {
        const refreshed = await refreshToken(current, credentials);
        await client.setTokens({ ...refreshed, refresh_token: refreshed.refresh_token ?? current.refreshToken });
        return refreshed.access_token;
      } catch (error) {
        // Only an expired/revoked grant needs browser sign-in. Network, server,
        // rate-limit and app-credential errors must not erase the saved session.
        if (!(error instanceof TokenError) || !error.expiredGrant) throw error;
      }
    }
  }

  const authRequest = await client.authorizationRequest({
    endpoint: SCHWAB_AUTH_URL,
    clientId: credentials.clientId,
    scope: "readonly",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const exchanged = await exchangeToken(authRequest, authorizationCode, credentials);
  await client.setTokens(exchanged);
  return exchanged.access_token;
}

// Share refresh/sign-in work between concurrent requests in this command.
let authorization: Promise<string> | undefined;
function authorizeOnce(rejectedAccessToken?: string, signIn = false): Promise<string> {
  if (!authorization) {
    authorization = authorize(rejectedAccessToken, signIn).finally(() => {
      authorization = undefined;
    });
  }
  return authorization;
}

export const schwabOAuth = { client, authorize: () => authorizeOnce() };
export const refreshRejectedToken = (token: string) => authorizeOnce(token);
export const signInToSchwab = () => authorizeOnce(undefined, true);
