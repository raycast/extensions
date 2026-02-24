import BeeperDesktop from "@beeper/desktop-api";
import { OAuth, getPreferenceValues, LocalStorage } from "@raycast/api";
import { OAuthService, getAccessToken } from "@raycast/utils";

let clientInstance: BeeperDesktop | null = null;
let lastAccessToken: string | null = null;

const BASE_URL = "http://localhost:23373";
const TOKEN_STORAGE_KEY = "beeper-oauth-token";

// Create the OAuth client configuration
const createOAuthClient = () =>
  new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Beeper Desktop",
    providerIcon: "beeper.png",
    providerId: "beeper-desktop-api",
    description: "Connect to your local Beeper Desktop app",
  });

// Export the OAuth service for use in withAccessToken
export function createBeeperOAuth() {
  return new OAuthService({
    client: createOAuthClient(),
    clientId: "raycast-beeper-extension",
    scope: "read write",
    authorizeUrl: `${BASE_URL}/oauth/authorize`,
    tokenUrl: `${BASE_URL}/oauth/token`,
    refreshTokenUrl: `${BASE_URL}/oauth/token`,
    bodyEncoding: "url-encoded",
    onAuthorize: async ({ token }) => {
      // Reset client when new token is obtained
      clientInstance = null;
      lastAccessToken = token;
      // Persist token to LocalStorage for AI tools
      await LocalStorage.setItem(TOKEN_STORAGE_KEY, token);
    },
  });
}

/**
 * Get the Beeper Desktop API client instance
 * Uses OAuth token from Raycast storage, with LocalStorage fallback for AI tools
 */
export async function getBeeperClient(): Promise<BeeperDesktop> {
  let accessToken: string | undefined;

  try {
    // First try OAuth storage (works for UI components)
    const tokenData = getAccessToken();
    accessToken = tokenData.token;
    if (!accessToken) {
      // Token is undefined/null, force fallback to LocalStorage
      throw new Error("OAuth token is empty");
    }
  } catch {
    // If getAccessToken fails (AI tools), try LocalStorage
    try {
      const storedToken = await LocalStorage.getItem<string>(TOKEN_STORAGE_KEY);
      accessToken = storedToken ?? undefined;
    } catch {
      console.warn("Could not retrieve token from storage, falling back to preferences");
    }
    if (!accessToken) {
      const preferences = getPreferenceValues<Preferences>();
      accessToken = preferences.accessToken;
    }
  }

  // Check if we need to recreate the client
  if (!clientInstance || lastAccessToken !== accessToken) {
    clientInstance = new BeeperDesktop({
      accessToken: accessToken,
      baseURL: BASE_URL,
      timeout: 10000,
      maxRetries: 2,
    });
    lastAccessToken = accessToken || null;
  }

  return clientInstance;
}

export async function resetAuth() {
  const oauth = createBeeperOAuth();
  await oauth.client.removeTokens();
  await LocalStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Check if Beeper Desktop API is available and responding
 */
export async function checkBeeperConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const client = await getBeeperClient();
    await client.accounts.list();
    return { connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed")) {
      return {
        connected: false,
        error:
          "Cannot connect to Beeper Desktop. Make sure Beeper is running and the Desktop API is enabled in Settings → Developers.",
      };
    }

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return {
        connected: false,
        error: "Authentication failed. Please run a command in Raycast to re-authorize.",
      };
    }

    return { connected: false, error: errorMessage };
  }
}
