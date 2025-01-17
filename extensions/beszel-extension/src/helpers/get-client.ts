import { getPreferenceValues, LocalStorage } from "@raycast/api";
import PocketBase, { AsyncAuthStore } from "pocketbase";
import { fetch } from "undici";
import { EventSource } from "eventsource";

// Raycast doesn't provide a fetch global or EventSource global.

// @ts-expect-error - types are expecting node fetch but undici is compatible.
global.fetch = fetch;
global.EventSource = EventSource;

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
    console.log("returning existing client");
    return cachedClient;
  }

  console.log("creating new client");

  cachedClient = createClient({ url, username, password });
  cachedCredentials = { url, username, password };

  return cachedClient;
}

async function createClient({ url, username, password }: Preferences.SearchSystems): Promise<PocketBase> {
  const initial = await LocalStorage.getItem<string>("beszel-token");

  // Create a new auth store.
  const store = new AsyncAuthStore({
    save: async (token) => {
      await LocalStorage.setItem("beszel-token", token);
    },
    initial,
    clear: async () => {
      await LocalStorage.removeItem("beszel-token");
    },
  });

  const client = new PocketBase(url, store);

  // Disable auto-cancellation of requests.
  client.autoCancellation(false);

  if (!client.authStore.isValid) {
    await client.collection("users").authWithPassword(username, password);
  }

  return client;
}
