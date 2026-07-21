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
 *
 * A newer key entered via the in-app form must not be silently reverted by a
 * stale preference. To reconcile, we remember the last preference value we acted
 * on (`PREF_SEEN_KEY`): the preference only wins when it has actually *changed*
 * since then; otherwise the active stored key (which the form may have updated)
 * is authoritative.
 */

import { LocalStorage, getPreferenceValues } from "@raycast/api";

/** The active API key (may be set by the preference or the in-app form). */
const STORAGE_KEY = "metals-dev-api-key";
/** The last preference value we reconciled, used to detect preference changes. */
const PREF_SEEN_KEY = "metals-dev-api-key-pref-seen";

/**
 * Resolve the API key. A non-empty preference wins only when it differs from the
 * last one we saw (a genuine user change); otherwise the stored active key wins,
 * so a key entered via the in-app form persists across launches instead of being
 * overwritten by an unchanged preference. Returns `null` when no key exists
 * anywhere (first run, or the preference was lost before it could be backed up).
 */
export async function resolveApiKey(): Promise<string | null> {
  const pref = getPreferenceValues<Preferences>().apiKey?.trim();
  if (pref) {
    const seen = (await LocalStorage.getItem<string>(PREF_SEEN_KEY))?.trim();
    if (pref !== seen) {
      // Preference is new or was changed by the user: it wins and becomes active.
      await LocalStorage.setItem(STORAGE_KEY, pref);
      await LocalStorage.setItem(PREF_SEEN_KEY, pref);
      return pref;
    }
    // Preference unchanged; an in-app form entry may hold a newer active key.
    const active = (await LocalStorage.getItem<string>(STORAGE_KEY))?.trim();
    return active || pref;
  }
  const stored = (await LocalStorage.getItem<string>(STORAGE_KEY))?.trim();
  return stored || null;
}

/** Persist a user-entered API key (from the in-app onboarding form). */
export async function saveApiKey(key: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, key.trim());
}
