import { OAuth } from "@raycast/api";
import { API_URL } from "./api-url";
import { testConnection } from "./api";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Clippy",
  providerIcon: "icon.png",
  description: "Connect your Clippy account",
});

// Global auth promise to prevent race conditions
let authPromise: Promise<string> | null = null;

export async function authorize(): Promise<string> {
  // Return existing auth promise if one is in progress (prevents race conditions)
  if (authPromise) {
    return authPromise;
  }

  authPromise = (async (): Promise<string> => {
    try {
      const tokenSet = await oauthClient.getTokens();
      if (tokenSet?.accessToken) {
        // Check if token is expired or will expire in the next 5 minutes
        if (
          tokenSet.refreshToken &&
          (tokenSet.isExpired() || (tokenSet.expiresIn !== undefined && tokenSet.expiresIn < 300))
        ) {
          try {
            const refreshedTokens = await refreshTokens(tokenSet.refreshToken);
            await oauthClient.setTokens(refreshedTokens);

            return refreshedTokens.access_token;
          } catch (error) {
            // Clear invalid tokens and cache, force re-auth
            await oauthClient.setTokens({
              access_token: "",
              refresh_token: "",
              expires_in: 0,
              scope: "",
            });
            // Reset auth promise and try again
            authPromise = null;
            return authorize();
          }
        }

        return tokenSet.accessToken;
      }

      // No tokens, start OAuth flow

      const authRequest = await oauthClient.authorizationRequest({
        endpoint: `${API_URL}/api/auth/raycast/authorize`,
        clientId: "raycast",
        scope: "read write",
      });


      const { authorizationCode } = await oauthClient.authorize(authRequest);

      const tokens = await fetchTokens(authRequest, authorizationCode);

      await oauthClient.setTokens(tokens);

      return tokens.access_token;
    } catch (error) {
      throw new Error("Failed to authenticate with Clippy. Please try again or check your connection.");
    }
  })();

  try {
    const token = await authPromise;
    return token;
  } finally {
    // Clear the promise when done (success or failure)
    authPromise = null;
  }
}

/**
 * Exchange authorization code for access/refresh tokens
 */
async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", "raycast");
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  try {
    const response = await fetch(`${API_URL}/api/auth/raycast/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error_description || errorData.error || `HTTP ${response.status}`;
      throw new Error(`Authentication failed: ${errorMessage}`);
    }

    return (await response.json()) as OAuth.TokenResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error during authentication");
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", "raycast");
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  try {
    const response = await fetch(`${API_URL}/api/auth/raycast/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error_description || errorData.error || `HTTP ${response.status}`;
      throw new Error(`Token refresh failed: ${errorMessage}`);
    }

    const tokenResponse = (await response.json()) as OAuth.TokenResponse;
    tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
    return tokenResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error during token refresh");
  }
}

/**
 * Check if user is currently authenticated (without triggering auth flow)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const tokenSet = await oauthClient.getTokens();
    if (!tokenSet?.accessToken) {
      return false;
    }

    // If token is expired and we don't have a refresh token, not authenticated
    if (tokenSet.isExpired() && !tokenSet.refreshToken) {
      return false;
    }

    // Test connection if not cached
    const connectionTest = await testConnection(tokenSet.accessToken, API_URL);
    if (connectionTest.success) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all authentication data
 */
export async function clearAuthentication(): Promise<void> {
  // Clear OAuth tokens
  await oauthClient.removeTokens();
  
  // Reset auth promise
  authPromise = null;
  
  // Clear any cached data
  const { LocalStorage, Cache } = await import("@raycast/api");
  await LocalStorage.clear();
  
  // Also clear Raycast cache
  try {
    const cache = new Cache();
    cache.clear();
  } catch (error) {
    // Silently ignore cache clear errors
  }
}
