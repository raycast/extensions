import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { TOKEN_EXPIRY_BUFFER } from "./constants";

interface AuthPreferences {
  clientId: string;
  clientSecret: string;
}

interface TokenData {
  access_token: string;
  expires_in: number;
  created_at: number;
}

const TOKEN_STORAGE_KEY = "42_token_data";

export async function getAccessToken(): Promise<string | null> {
  try {
    const tokenDataStr = await LocalStorage.getItem<string>(TOKEN_STORAGE_KEY);
    if (!tokenDataStr) {
      return null;
    }

    const tokenData: TokenData = JSON.parse(tokenDataStr);

    // Check if token is expired (with 60 second buffer)
    const expiresAt = tokenData.created_at + tokenData.expires_in * 1000;
    if (Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER) {
      // Token expired or about to expire, fetch new one
      return await fetchNewToken();
    }

    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

async function fetchNewToken(): Promise<string> {
  const preferences = getPreferenceValues<AuthPreferences>();

  if (!preferences.clientId || !preferences.clientSecret) {
    throw new Error("Client ID and Client Secret must be configured in preferences");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", preferences.clientId);
  params.append("client_secret", preferences.clientSecret);

  const response = await fetch("https://api.intra.42.fr/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await response.json();

  const tokenToStore: TokenData = {
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in || 7200, // Default to 2 hours if not provided
    created_at: Date.now(),
  };

  await LocalStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenToStore));

  return tokenData.access_token;
}

export async function ensureAuthenticated(): Promise<string> {
  let accessToken = await getAccessToken();

  if (!accessToken) {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Authenticating...",
        message: "Fetching access token",
      });

      accessToken = await fetchNewToken();

      showToast({
        style: Toast.Style.Success,
        title: "Authenticated",
        message: "Successfully connected to 42 API",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to authenticate";
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: errorMessage,
      });
      throw error;
    }
  }

  return accessToken;
}

export async function getTokenInfo(): Promise<{
  token: string | null;
  expiresIn: number | undefined;
  expiresAt: Date | undefined;
}> {
  try {
    const tokenDataStr = await LocalStorage.getItem<string>(TOKEN_STORAGE_KEY);
    if (!tokenDataStr) {
      return { token: null, expiresIn: undefined, expiresAt: undefined };
    }

    const tokenData: TokenData = JSON.parse(tokenDataStr);
    const expiresAt = new Date(tokenData.created_at + tokenData.expires_in * 1000);

    return {
      token: tokenData.access_token,
      expiresIn: tokenData.expires_in,
      expiresAt: expiresAt,
    };
  } catch (error) {
    return { token: null, expiresIn: undefined, expiresAt: undefined };
  }
}
