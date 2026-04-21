import { OAuth, getPreferenceValues, LocalStorage } from "@raycast/api";
import { Preference } from "./types";

const AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const SCOPES = "email personal daily heartrate tag workout session spo2";

// Lock configuration
const LOCK_KEY = "oura_auth_lock";
const LOCK_TIMEOUT_MS = 30000; // 30 seconds
const RETRY_DELAY_MS = 2000; // 2 seconds
const MAX_RETRIES = 5;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Oura",
  providerIcon: "command-icon.png",
  description: "Connect your Oura account to read your data.",
});

function getPreferences(): Preference {
  const preferences = getPreferenceValues<Preference>();
  if (!preferences.client_id || !preferences.client_secret) {
    throw new Error("Missing Oura client credentials. Please set them in preferences.");
  }
  return preferences;
}

export async function getAccessToken(): Promise<string> {
  await authorize();
  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    throw new Error("Missing access token. Please re-authenticate.");
  }
  return tokenSet.accessToken;
}

async function authorize(retryCount = 0): Promise<void> {
  // First check: if we already have valid tokens, return immediately
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  // Check for existing lock (another command is authorizing)
  const lockValue = await LocalStorage.getItem<string>(LOCK_KEY);
  if (lockValue) {
    const lockTime = parseInt(lockValue, 10);
    if (Date.now() - lockTime < LOCK_TIMEOUT_MS) {
      // Another command is authorizing, wait and retry
      console.log("Another authorization in progress, waiting...");
      if (retryCount >= MAX_RETRIES) {
        throw new Error("Authorization timeout: another authorization is taking too long.");
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return authorize(retryCount + 1);
    }
    // Lock is stale, we can proceed
    console.log("Found stale lock, clearing and proceeding...");
  }

  // Acquire lock
  await LocalStorage.setItem(LOCK_KEY, Date.now().toString());
  console.log("Lock acquired, starting authorization...");

  try {
    // CRITICAL: Re-check for tokens after acquiring the lock!
    // Another command may have completed authorization while we were waiting
    const tokensAfterLock = await client.getTokens();
    if (tokensAfterLock?.accessToken) {
      console.log("Tokens already exist (another command completed auth), skipping...");
      if (tokensAfterLock.refreshToken && tokensAfterLock.isExpired()) {
        await client.setTokens(await refreshTokens(tokensAfterLock.refreshToken));
      }
      return;
    }

    const preferences = getPreferences();
    const authRequest = await client.authorizationRequest({
      endpoint: AUTHORIZE_URL,
      clientId: preferences.client_id,
      scope: SCOPES,
    });

    const { authorizationCode } = await client.authorize(authRequest);
    await client.setTokens(await fetchTokens(authRequest, authorizationCode));
    console.log("Authorization complete, tokens saved.");
  } finally {
    // Always release the lock
    await LocalStorage.removeItem(LOCK_KEY);
    console.log("Lock released.");
  }
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const preferences = getPreferences();
  const params = new URLSearchParams();

  params.append("client_id", preferences.client_id.trim());
  params.append("client_secret", preferences.client_secret.trim());
  params.append("code", authCode);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("scope", SCOPES);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("fetch tokens error status:", response.status);
    console.error("fetch tokens error body:", errorText);
    throw new Error(`${response.statusText}: ${errorText}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const preferences = getPreferences();
  const params = new URLSearchParams();

  params.append("client_id", preferences.client_id.trim());
  params.append("client_secret", preferences.client_secret.trim());
  params.append("refresh_token", refreshToken.trim());
  params.append("grant_type", "refresh_token");
  params.append("scope", SCOPES);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
