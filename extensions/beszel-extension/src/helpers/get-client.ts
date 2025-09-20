import { getPreferenceValues, LocalStorage } from "@raycast/api";
import PocketBase, { AsyncAuthStore } from "pocketbase";
import { EventSource } from "eventsource";
import { fetch } from "undici";

// Raycast doesn't provide a fetch global or EventSource global.

// @ts-expect-error - types are expecting node fetch but undici is compatible.
global.fetch = fetch;
global.EventSource = EventSource;

const BESZEL_TOKEN_KEY = "beszel-token";

let cachedClient: Promise<PocketBase> | null = null;
let cachedCredentials: Preferences.SearchSystems | null = null;

export async function getClient() {
  const { url, username, password } = getPreferenceValues<Preferences.SearchSystems>();

  // Return the existing client if it exists.
  if (
    cachedClient &&
    cachedCredentials?.username === username &&
    cachedCredentials?.password === password &&
    cachedCredentials?.url === url
  ) {
    return cachedClient;
  }

  // The credentials have changed or the client doesn't exist. If the client
  // exists, clear the auth store.
  if (cachedClient) {
    const client = await cachedClient;
    client.authStore.clear();

    // Clear the token from local storage.
    await LocalStorage.removeItem(BESZEL_TOKEN_KEY);
  }

  cachedClient = createClient({ url, username, password });
  cachedCredentials = { url, username, password };

  return cachedClient;
}

export async function createClient({ url, username, password }: Preferences.SearchSystems): Promise<PocketBase> {
  const initial = await LocalStorage.getItem<string>(BESZEL_TOKEN_KEY);

  // Create a new auth store.
  const store = new AsyncAuthStore({
    save: async (token) => {
      await LocalStorage.setItem(BESZEL_TOKEN_KEY, token);
    },
    initial,
    clear: async () => {
      await LocalStorage.removeItem(BESZEL_TOKEN_KEY);
    },
  });

  const client = new PocketBase(url, store);

  // Disable auto-cancellation of requests.
  client.autoCancellation(false);

  // If the provided credentials are not valid, then perform an auth request to
  // validate them and create the new token.
  if (!client.authStore.isValid) {
    await client.collection("users").authWithPassword(username, password);
  }

  return client;
}
