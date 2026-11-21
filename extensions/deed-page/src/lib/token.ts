import { getPreferenceValues, LocalStorage } from "@raycast/api";

const STORAGE_KEY = "ownerToken";

/**
 * The owner token to send with requests: the one set in preferences, or the one
 * deed.page returned on this extension's first publish. It is never logged or shown.
 */
export async function getOwnerToken(): Promise<string | undefined> {
  const { ownerToken } = getPreferenceValues<Preferences>();
  const fromPreferences = ownerToken?.trim();
  if (fromPreferences) return fromPreferences;
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return stored || undefined;
}

/** Keep a newly issued token so later publishes stay under the same owner. */
export async function saveIssuedToken(token: string | undefined): Promise<void> {
  if (!token) return;
  const { ownerToken } = getPreferenceValues<Preferences>();
  if (ownerToken?.trim()) return;
  await LocalStorage.setItem(STORAGE_KEY, token);
}
