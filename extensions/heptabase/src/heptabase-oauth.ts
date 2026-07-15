import { OAuth, LocalStorage } from "@raycast/api";

// Heptabase doesn't require pre-registered client_id!
// Uses Dynamic Client Registration (RFC 7591)

// Create OAuth Client
// Note: Raycast's OAuth.PKCEClient automatically handles token exchange
export const heptabaseOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Heptabase",
  providerIcon: "heptabase.png",
  providerId: "heptabase",
  description: "Connect your Heptabase account to use MCP features",
});

// OAuth Endpoints - these are fetched dynamically from server metadata
interface OAuthEndpoints {
  authorization: string;
  token: string;
  registration?: string;
}

// OAuth Authorization Server Metadata (RFC 8414)
interface OAuthAuthorizationServerMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
}

let cachedEndpoints: OAuthEndpoints | null = null;
let cachedClientId: string | null = null;
// Promise to prevent race condition during client registration
let clientRegistrationPromise: Promise<string> | null = null;

/**
 * Discover OAuth endpoints (from Heptabase metadata)
 *
 * Known Heptabase endpoints:
 * - Authorization: https://api.heptabase.com/auth
 * - Token: https://api.heptabase.com/token
 * - Registration: https://api.heptabase.com/v1/oauth/register
 * - Scopes: openid, profile, email, space:read, space:write, offline_access
 */
async function discoverEndpoints(): Promise<OAuthEndpoints> {
  if (cachedEndpoints) {
    return cachedEndpoints;
  }

  try {
    // Fetch directly from well-known endpoint
    const authMetadata: OAuthAuthorizationServerMetadata = await fetch(
      "https://api.heptabase.com/.well-known/oauth-authorization-server",
    ).then((r) => r.json() as Promise<OAuthAuthorizationServerMetadata>);

    cachedEndpoints = {
      authorization: authMetadata.authorization_endpoint, // https://api.heptabase.com/auth
      token: authMetadata.token_endpoint, // https://api.heptabase.com/token
      registration: authMetadata.registration_endpoint, // https://api.heptabase.com/v1/oauth/register
    };

    return cachedEndpoints;
  } catch (error) {
    console.error("❌ Failed to discover endpoints:", error);
    throw new Error(`Failed to discover OAuth endpoints: ${error}`);
  }
}

/**
 * Dynamic OAuth client registration (RFC 7591)
 * Heptabase MCP supports this, so no need for pre-registered client_id
 *
 * Uses Promise-based locking to prevent race conditions
 */
async function registerClient(endpoints: OAuthEndpoints): Promise<string> {
  // If already in memory cache, return directly
  if (cachedClientId) {
    return cachedClientId;
  }

  // If registration is in progress, wait for it to complete
  if (clientRegistrationPromise) {
    return await clientRegistrationPromise;
  }

  // Create new registration Promise
  clientRegistrationPromise = (async () => {
    try {
      // Check if already registered in LocalStorage
      const savedClientId = await LocalStorage.getItem<string>("heptabase_client_id");
      if (savedClientId) {
        cachedClientId = savedClientId;
        return savedClientId;
      }

      if (!endpoints.registration) {
        throw new Error("Server does not support dynamic client registration");
      }

      // Redirect URI pattern used by Raycast
      const registrationResponse = await fetch(endpoints.registration, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "Raycast Heptabase Extension",
          redirect_uris: ["https://raycast.com/redirect", "https://raycast.com/redirect?packageName=Extension"],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "none", // Public client (PKCE)
        }),
      });

      if (!registrationResponse.ok) {
        const errorText = await registrationResponse.text();
        console.error("❌ Client registration failed:", errorText);
        throw new Error(`Client registration failed: ${errorText}`);
      }

      const registration = (await registrationResponse.json()) as { client_id: string };
      const clientId = registration.client_id;

      // Save client_id to LocalStorage and memory cache
      await LocalStorage.setItem("heptabase_client_id", clientId);
      cachedClientId = clientId;

      return clientId;
    } finally {
      // Clear Promise after registration completes, allowing future registrations (if needed)
      clientRegistrationPromise = null;
    }
  })();

  return await clientRegistrationPromise;
}

/**
 * Authorization function - Ensure user is logged in
 */
export async function authorize(): Promise<void> {
  const tokenSet = await heptabaseOAuthClient.getTokens();

  // If already have token
  if (tokenSet?.accessToken) {
    // Check if expired
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await heptabaseOAuthClient.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  // Need new authorization

  // 1. Discover OAuth endpoints
  const endpoints = await discoverEndpoints();

  // 2. Register client dynamically (if supported)
  let clientId: string;
  if (endpoints.registration) {
    clientId = await registerClient(endpoints);
  } else {
    // If dynamic registration not supported, use fixed client_id
    // In this case, would need to pre-register with Heptabase
    throw new Error("Heptabase MCP does not support dynamic client registration. Please contact Heptabase support.");
  }

  // 3. Create authorization request
  const authRequest = await heptabaseOAuthClient.authorizationRequest({
    endpoint: endpoints.authorization,
    clientId: clientId,
    scope: "openid profile email space:read space:write offline_access",
    extraParameters: {
      // Pass token endpoint to Raycast (if supported)
      token_endpoint: endpoints.token,
    },
  });

  // 4. Authorize: Open browser and get authorization code
  // Note: Raycast's authorize() will try to exchange token automatically
  // But since we use dynamic client registration, we handle it manually
  const { authorizationCode } = await heptabaseOAuthClient.authorize(authRequest);

  // 5. Manually exchange authorization code for access token
  // Use PKCE (code_verifier) to ensure security
  const tokens = await fetchTokens(endpoints, clientId, authRequest, authorizationCode);

  // 6. Save tokens to Raycast
  await heptabaseOAuthClient.setTokens(tokens);
}

/**
 * Exchange authorization code for access token
 */
async function fetchTokens(
  endpoints: OAuthEndpoints,
  clientId: string,
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(endpoints.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Token exchange failed");
    console.error("   Status:", response.status, response.statusText);
    console.error("   Error:", errorText);
    console.error("   Client ID used:", clientId);
    console.error("   Redirect URI used:", authRequest.redirectURI);
    throw new Error(`Failed to fetch tokens: ${response.statusText} - ${errorText}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;

  return tokenResponse;
}

/**
 * Refresh access token
 */
async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  // Need endpoints and client_id
  const endpoints = await discoverEndpoints();
  const clientId = cachedClientId || (await registerClient(endpoints));

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(endpoints.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh error:", errorText);
    throw new Error(`Failed to refresh tokens: ${response.statusText}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  // Keep old refresh token if no new one
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

/**
 * Get current access token
 */
export async function getAccessToken(): Promise<string> {
  const tokenSet = await heptabaseOAuthClient.getTokens();

  // If no token at all, authorize
  if (!tokenSet?.accessToken) {
    await authorize();
    const newTokenSet = await heptabaseOAuthClient.getTokens();
    if (!newTokenSet?.accessToken) {
      throw new Error("No access token available after authorization");
    }
    return newTokenSet.accessToken;
  }

  // If token is expired and we have refresh token, refresh it
  if (tokenSet.isExpired() && tokenSet.refreshToken) {
    try {
      const refreshedTokens = await refreshTokens(tokenSet.refreshToken);
      await heptabaseOAuthClient.setTokens(refreshedTokens);
      return refreshedTokens.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // If refresh fails, clear tokens and re-authorize
      await heptabaseOAuthClient.removeTokens();
      throw new Error("Token expired and refresh failed. Please re-authorize.");
    }
  }

  return tokenSet.accessToken;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await heptabaseOAuthClient.removeTokens();
  // Clear memory cache
  cachedClientId = null;
  cachedEndpoints = null;
  clientRegistrationPromise = null;
  // Clear LocalStorage
  await LocalStorage.removeItem("heptabase_client_id");
}

/**
 * Force refresh the access token (for testing)
 * Returns the new access token if successful
 */
export async function forceRefreshToken(): Promise<{ success: boolean; message: string; newToken?: string }> {
  const tokenSet = await heptabaseOAuthClient.getTokens();

  if (!tokenSet?.refreshToken) {
    return { success: false, message: "No refresh token available" };
  }

  try {
    const refreshedTokens = await refreshTokens(tokenSet.refreshToken);
    await heptabaseOAuthClient.setTokens(refreshedTokens);
    return {
      success: true,
      message: "Token refreshed successfully!",
      newToken: refreshedTokens.access_token,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Force refresh failed:", error);
    return { success: false, message: `Refresh failed: ${errorMessage}` };
  }
}
