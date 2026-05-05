// src/oauth.ts
import { OAuth } from "@raycast/api";

// --- CONFIGURATION ---
// OAuth credentials
const clientId = "app_aLGHhWSHe8e3d494VRiNtac2";
const proxiedAuthorizeUrl =
  "https://oauth.raycast.com/v1/authorize/NxaZKqcp7vp8pAw3Mp8r8UOXy_z3pnka8zfft5NcBEoB09N36m-7Y6r_EBUphunBEkTTec8UnAC_hq1ENW73rgp77by3LF_mXqJ4ct1g9kqbLRe8Hx1ezlHoU2sxnqKZfzHWkdV7hGugdqZksA";
const proxiedTokenUrl =
  "https://oauth.raycast.com/v1/token/5p7_7xQdzkXilZdhppv_or2B9wwd0Sm7Fx0khb74h_MHnro7AO5w4tr9-aj5vJe4C0NnlLsV1Onr24ndgmFR5J_yRpV6b_hD8BzYSg6lcH1Q7s-1DUfZ0JFlZjE2nF0j-vunQ34iLi8d8w";
const proxiedRefreshTokenUrl =
  "https://oauth.raycast.com/v1/refresh-token/hiXK17eErlQSoxjH5w0qTI3fjCmQt-Qw7TWqV0PhNEi6xvSqLjnklSkwNy7D0g67FwQAfXV3udahWqjl2tFPa5b7zO_rFNtJQTvPto9gQMrQDdQFFC6VvdGZstEn8K2juivJh2SwmBzBfg";

// Define the permissions your app needs
const SCOPES =
  "organizations.read profiles.read payments.read payments.write sales-invoices.read sales-invoices.write balances.read settlements.read payment-links.read payment-links.write subscriptions.read subscriptions.write refunds.write refunds.read";

// --- OAUTH CLIENT ---
// Using Raycast's PKCE client with built-in token management
export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Mollie",
  providerIcon: "mollie-icon.png",
  description: "Connect your Mollie account to Raycast.",
});

// --- CORE AUTHENTICATION LOGIC ---
export async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      try {
        const newTokens = await refreshTokens(tokenSet.refreshToken);
        await client.setTokens(newTokens);
        return newTokens.access_token;
      } catch (error) {
        // If refresh fails, clear tokens and re-authorize
        console.error("Token refresh failed, clearing tokens:", error);
        await client.removeTokens();
        // Recursive call to start fresh authorization
        return authorize();
      }
    }
    return tokenSet.accessToken;
  }

  // Raycast generates the correct redirectURI automatically
  const authRequest = await client.authorizationRequest({
    endpoint: proxiedAuthorizeUrl,
    clientId: clientId,
    scope: SCOPES,
  });

  const { authorizationCode } = await client.authorize(authRequest);

  try {
    const newTokens = await fetchTokens(authRequest, authorizationCode);
    await client.setTokens(newTokens);
    return newTokens.access_token;
  } catch (error) {
    // If token exchange fails with invalid_grant, clear any stored tokens
    console.error("Token exchange failed:", error);
    await client.removeTokens();
    throw error;
  }
}

// --- HELPER FUNCTIONS ---
async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  console.log("Fetching tokens with redirect_uri:", authRequest.redirectURI);

  const response = await fetch(proxiedTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      code: authCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      // Use the URI that Raycast just generated for consistency
      redirect_uri: authRequest.redirectURI,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("fetchTokens error:", errorBody);
    console.error("Request details - redirect_uri:", authRequest.redirectURI);
    throw new Error(`Failed to fetch tokens: ${response.status} - ${errorBody}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch(proxiedRefreshTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    await client.removeTokens();
    const errorBody = await response.text();
    console.error("refreshTokens error:", errorBody);
    throw new Error(`Failed to refresh tokens: ${response.status} - ${errorBody}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
