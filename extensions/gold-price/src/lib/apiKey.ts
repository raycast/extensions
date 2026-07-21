/**
 * Durable resolution of the metals.dev API key.
 *
 * The key is declared as an optional `password` preference, but Raycast stores
 * password preferences in the macOS Keychain, and for a development/local
 * extension that value is not persisted reliably across sessions (it silently
 * disappears, re-prompting the user). Raycast's `LocalStorage` — a local
 * encrypted database scoped to this extension — does persist reliably, so we
 * mirror the key there and treat it as the source of truth when the preference
 * is empty. There is no API to write back into a preference, so LocalStorage is
 * the durable store once the preference is lost.
 */

import { LocalStorage, getPreferenceValues } from "@raycast/api";

const STORAGE_KEY = "metals-dev-api-key";

interface Preferences {
  apiKey?: string;
}

/**
 * Resolve the API key, preferring a non-empty preference (which is mirrored into
 * LocalStorage as a backup) and otherwise falling back to the stored copy.
 * Returns `null` when no key is available anywhere (first run, or the preference
 * was lost before it could be backed up).
 */
export async function resolveApiKey(): Promise<string | null> {
  const pref = getPreferenceValues<Preferences>().apiKey?.trim();
  if (pref) {
    // Back it up before Raycast can drop it; only write on change to avoid churn.
    const backup = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (backup !== pref) {
      await LocalStorage.setItem(STORAGE_KEY, pref);
    }
    return pref;
  }
  const stored = (await LocalStorage.getItem<string>(STORAGE_KEY))?.trim();
  return stored || null;
}

/** Persist a user-entered API key (from the in-app onboarding form). */
export async function saveApiKey(key: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, key.trim());
}
