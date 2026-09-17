import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  connect,
  createAppLink,
  createDeepLink,
  createKeychainStore,
  createQobuzClient,
  type CredentialStore,
  type QobuzClient,
  type StoredCredentials,
} from "@kud/qobuz";

const STORAGE_KEY = "qobuz-credentials";

const localStore: CredentialStore = {
  load: async () => {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCredentials) : undefined;
  },
  save: async (credentials) => {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  },
  clear: async () => {
    await LocalStorage.removeItem(STORAGE_KEY);
  },
};

const keychainStore = createKeychainStore();

export const getClient = async (): Promise<QobuzClient> => {
  const { token } = getPreferenceValues<Preferences>();

  if (token) {
    const cached = await localStore.load();
    if (cached?.token === token) return createQobuzClient({ store: localStore });
    return connect({ token, store: localStore });
  }

  const shared = await keychainStore.load();
  if (shared) return createQobuzClient({ store: keychainStore });

  throw new Error(
    "No Qobuz token found. Add one in the extension preferences, or run `qobuz login` with the Qobuz CLI.",
  );
};

export const deepLink = createDeepLink();

export const BRAND = "#22D3EE";

export const appLink = createAppLink();

export const formatDuration = (seconds?: number): string => {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
};
