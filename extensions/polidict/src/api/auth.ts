import { OAuth } from "@raycast/api";
import { getApiUrl } from "./config";

const RAYCAST_CLIENT_ID = "raycast";
type AuthLocale = "en" | "uk";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Polidict",
  providerIcon: "extension-icon.png",
  providerId: "polidict",
  description: "Connect your Polidict account",
});

// Mutex to prevent concurrent token refresh attempts
let refreshPromise: Promise<{
  accessToken: string;
  refreshToken: string;
}> | null = null;

interface TokenResponsePayload {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

function getAuthLocale(): AuthLocale {
  return "en";
}

async function storeTokens(tokens: TokenResponsePayload): Promise<void> {
  await client.setTokens({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
  });
}

function isLikelyJwtToken(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value) && value.split(".").length === 3;
}

function extractTokenFromMagicLinkUrl(value: string, depth: number = 0): string | null {
  if (depth > 3) {
    return null;
  }

  try {
    const url = new URL(value);
    const token = url.searchParams.get("token");
    if (token) {
      return token;
    }

    const nestedTarget = url.searchParams.get("target");
    if (nestedTarget) {
      return (
        extractTokenFromMagicLinkUrl(nestedTarget, depth + 1) ??
        extractTokenFromMagicLinkUrl(decodeURIComponent(nestedTarget), depth + 1)
      );
    }

    const pathTokenMatch = url.pathname.match(/\/auth\/([^/?#]+)/);
    if (pathTokenMatch?.[1]) {
      return decodeURIComponent(pathTokenMatch[1]);
    }
  } catch {
    return null;
  }

  return null;
}

function extractMagicLinkToken(magicLinkOrToken: string): string {
  const value = magicLinkOrToken.trim();
  if (!value) {
    throw new Error("Magic link URL or token is required");
  }

  const tokenFromUrl = extractTokenFromMagicLinkUrl(value);
  if (tokenFromUrl) {
    return tokenFromUrl;
  }

  const deepLinkTokenMatch = value.match(/:\/\/auth\/([^/?#]+)/);
  if (deepLinkTokenMatch?.[1]) {
    return decodeURIComponent(deepLinkTokenMatch[1]);
  }

  if (isLikelyJwtToken(value)) {
    return value;
  }

  throw new Error("Paste the full magic link URL or token from your email");
}

export async function signInWithGoogle(): Promise<string> {
  const apiUrl = getApiUrl();

  // Check existing tokens
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    return tokenSet.accessToken;
  }

  // Create auth request with PKCE
  const authRequest = await client.authorizationRequest({
    endpoint: `${apiUrl}/api/auth/init`,
    clientId: RAYCAST_CLIENT_ID,
    scope: "email profile",
  });

  // Get authorization URL from backend
  const initUrl = new URL(`${apiUrl}/api/auth/init`);
  initUrl.searchParams.set("code_challenge", authRequest.codeChallenge);
  initUrl.searchParams.set("platform", "raycast");
  initUrl.searchParams.set("provider", "google");
  initUrl.searchParams.set("state", authRequest.state);
  initUrl.searchParams.set("redirect_uri", authRequest.redirectURI);

  const initResponse = await fetch(initUrl.toString());
  if (!initResponse.ok) {
    throw new Error("Failed to initialize authentication");
  }

  const { authorizationUrl } = (await initResponse.json()) as {
    state: string;
    authorizationUrl: string;
  };

  // Open authorization in browser
  const { authorizationCode } = await client.authorize({
    url: authorizationUrl,
  });

  // Exchange code for tokens
  const tokenResponse = await fetch(`${apiUrl}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: authorizationCode,
      state: authRequest.state,
      codeVerifier: authRequest.codeVerifier,
      clientId: RAYCAST_CLIENT_ID,
      provider: "google",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to exchange authorization code for tokens");
  }

  const tokens = (await tokenResponse.json()) as TokenResponsePayload;
  await storeTokens(tokens);
  return tokens.accessToken;
}

export async function authorize(): Promise<string> {
  return signInWithGoogle();
}

export async function requestEmailMagicLink(email: string, locale: AuthLocale = getAuthLocale()): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const apiUrl = getApiUrl();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const response = await fetch(`${apiUrl}/api/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: normalizedEmail,
      locale,
      clientId: RAYCAST_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send magic link");
  }
}

export async function verifyEmailMagicLink(magicLinkOrToken: string): Promise<string> {
  const token = extractMagicLinkToken(magicLinkOrToken);
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/api/auth/magic-link/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      clientId: RAYCAST_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to verify magic link");
  }

  const tokens = (await response.json()) as TokenResponsePayload;
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error("Token response is missing required fields");
  }

  await storeTokens(tokens);
  return tokens.accessToken;
}

export async function getAccessToken(): Promise<string | null> {
  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    return null;
  }

  // Check if token is expired OR if we don't have expiry info (old tokens)
  // If no expiry info, try to refresh to get proper tokens
  const needsRefresh = tokenSet.isExpired() || !tokenSet.expiresIn;

  if (tokenSet.refreshToken && needsRefresh) {
    try {
      // Use mutex to prevent concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = refreshTokens(tokenSet.refreshToken).finally(() => {
          refreshPromise = null;
        });
      }
      const refreshedTokens = await refreshPromise;
      return refreshedTokens.accessToken;
    } catch {
      // If refresh fails, clear tokens to trigger re-auth
      await client.removeTokens();
      return null;
    }
  }

  return tokenSet.accessToken;
}

async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh tokens");
  }

  const tokens = (await response.json()) as TokenResponsePayload;
  await storeTokens(tokens);

  return tokens;
}

export async function logout(): Promise<void> {
  await client.removeTokens();
}

export function getOAuthClient(): OAuth.PKCEClient {
  return client;
}
