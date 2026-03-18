import { OAuth, getPreferenceValues } from "@raycast/api";

interface Preferences {
  googleClientId: string;
  googleClientSecret: string;
}

const SCOPES = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/directory.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

// Single PKCEClient instance with a stable providerId — ensures tokens are persisted and reused
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Google",
  providerIcon: "extension-icon.png",
  providerId: "fantastical-ai-google",
  description: "Connect your Google account for calendar and contacts access",
});

function getCredentials(): { clientId: string; clientSecret: string } {
  const { googleClientId, googleClientSecret } =
    getPreferenceValues<Preferences>();
  if (!googleClientId || !googleClientSecret) {
    throw new Error(
      "Google Client ID and Secret are not configured. Please set them in the extension preferences.",
    );
  }
  return { clientId: googleClientId, clientSecret: googleClientSecret };
}

async function fetchTokens(
  clientId: string,
  clientSecret: string,
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  console.log("OAuth fetchTokens: redirect_uri =", authRequest.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OAuth fetchTokens FAILED:", response.status, text);
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  console.log(
    "OAuth fetchTokens SUCCESS: has access_token =",
    !!tokenResponse.access_token,
    "has refresh_token =",
    !!tokenResponse.refresh_token,
    "expires_in =",
    tokenResponse.expires_in,
  );
  return tokenResponse;
}

async function refreshTokens(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OAuth refreshTokens FAILED:", response.status, text);
    throw new Error(`Token refresh failed: ${response.status} ${text}`);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

export async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();

  // Check for existing valid tokens first
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      console.log("OAuth: token expired, refreshing...");
      await client.setTokens(
        await refreshTokens(clientId, clientSecret, tokenSet.refreshToken),
      );
      const updated = await client.getTokens();
      return updated!.accessToken;
    }
    console.log("OAuth: using stored access token");
    return tokenSet.accessToken;
  }

  // No stored tokens — start new authorization flow
  console.log("OAuth: no stored tokens, starting new auth flow");
  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: clientId,
    scope: SCOPES,
    extraParameters: {
      access_type: "offline",
    },
  });

  const { authorizationCode } = await client.authorize(authRequest);
  console.log("OAuth: got authorization code, exchanging for tokens...");

  const tokenResponse = await fetchTokens(
    clientId,
    clientSecret,
    authRequest,
    authorizationCode,
  );

  await client.setTokens(tokenResponse);
  console.log("OAuth: tokens stored successfully");

  const newTokens = await client.getTokens();
  return newTokens!.accessToken;
}
