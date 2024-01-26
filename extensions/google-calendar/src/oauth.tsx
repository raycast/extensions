import { OAuth, Toast, showToast } from "@raycast/api";
import fetch from "node-fetch";

const clientId = "115338553756-o58jesunhorpgmnk1k53nsjnufdo82lt.apps.googleusercontent.com";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google Calendar account",
});

interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType?: string;
  expiresIn?: number;
  updatedAt: Date;
  isExpired(): boolean;
}

// Customize this function to convert TokenResponse to TokenSet, if needed
function toTokenSet(tokenResponse:any): TokenSet {

  const now = new Date();
  
  return {
    accessToken: tokenResponse.access_token || "",
    refreshToken: tokenResponse.refresh_token,
    idToken: tokenResponse.id_token,
    tokenType: tokenResponse.token_type || "",
    expiresIn: tokenResponse.expires_in,
    updatedAt: now,
    isExpired: function () {
      return (this.expiresIn ? now >= new Date(this.updatedAt.getTime() + this.expiresIn * 1000) : true);
    },
  };
}

// Authorization
export async function authorize(retryCount = 0): Promise<string> {
  // Try to get the stored tokens
  let tokenSet: TokenSet | null = (await client.getTokens()) || null;

  if (!tokenSet || tokenSet.isExpired()) {

    // If there is a refreshToken, try to refresh the access token
    if (tokenSet?.refreshToken) {
      try {
        const refreshedTokens = await refreshTokens(tokenSet.refreshToken);
        await client.setTokens(refreshedTokens);
        tokenSet = refreshedTokens;
      } catch (refreshError) {
        console.error('Error refreshing tokens:', refreshError);
        // Handle failure - possibly by asking the user to re-authenticate here
        throw new Error('Please re-authenticate to refresh the access token.');
      }
    } else {
      console.log('No refresh token available, initiating full authorization flow.');
      // No refreshToken available, so initiate a full auth flow
      try {
        // Begin a new authorization flow to acquire tokens
        const authRequest = await client.authorizationRequest({
          endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
          clientId: clientId,
          scope: "https://www.googleapis.com/auth/calendar",
        });
        const { authorizationCode } = await client.authorize(authRequest);
        const newTokens = await fetchTokens(authRequest, authorizationCode);
        await client.setTokens(newTokens);
        tokenSet = newTokens;
      } catch (authorizationError) {
        console.error('Authorization Error:', authorizationError);
        throw new Error('Authorization failed. Please try again.');
      }
    }
  }

  if (!tokenSet?.accessToken) {
    if (retryCount < 3) {
        console.log(`Retrying authorization... (${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential back-off
        return authorize(retryCount + 1); // Recursive call with incremented retry count
    } else {
        // Throw an error only after certain retries
        throw new Error('Access token not available after authorization flow.');
    }
}


  return tokenSet.accessToken;
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<TokenSet> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  return toTokenSet(tokenResponse);
}


async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  return toTokenSet({
    ...tokenResponse,
    refresh_token: refreshToken,
  });
}

// Export the OAuth client
export { client };

export async function logoutAndClearToken() {
  try {
    await client.removeTokens();
    showToast(Toast.Style.Success, "Logged out successfully.");
  } catch (error: unknown) { 
    if (error instanceof Error) {
      showToast(Toast.Style.Failure, "Failed to log out.", error.message);
    } else {
      showToast(Toast.Style.Failure, "Failed to log out.", String(error));
    }
  }
}
  
  