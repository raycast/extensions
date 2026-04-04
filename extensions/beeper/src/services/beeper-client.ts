import BeeperDesktop from "@beeper/desktop-api";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getAccessToken } from "@raycast/utils";
import { createBeeperOAuth, TOKEN_STORAGE_KEY } from "../api";

interface Preferences {
  baseUrl?: string;
}

let clientInstance: BeeperDesktop | null = null;
let lastAccessToken: string | null = null;
let lastBaseURL: string | null = null;

const getBaseURL = () => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.baseUrl || "http://localhost:23373";
};

export async function getBeeperClient(): Promise<BeeperDesktop> {
  let accessToken: string | undefined;

  try {
    accessToken = getAccessToken().token;
  } catch {
    accessToken = undefined;
  }

  if (!accessToken) {
    accessToken = (await LocalStorage.getItem<string>(TOKEN_STORAGE_KEY)) ?? undefined;
  }

  if (!accessToken) {
    throw new Error("Authentication required. Run a Beeper command in Raycast to authorize first.");
  }

  const baseURL = getBaseURL();
  if (!clientInstance || lastAccessToken !== accessToken || lastBaseURL !== baseURL) {
    clientInstance = new BeeperDesktop({
      accessToken,
      baseURL,
      timeout: 10000,
      maxRetries: 2,
    });
    lastAccessToken = accessToken;
    lastBaseURL = baseURL;
  }

  return clientInstance;
}

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
          "Cannot connect to Beeper Desktop. Make sure Beeper is running and the Desktop API is enabled in Settings -> Developers.",
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

export async function clearStoredAuthentication() {
  const oauth = createBeeperOAuth();
  await oauth.client.removeTokens();
  await LocalStorage.removeItem(TOKEN_STORAGE_KEY);
}
