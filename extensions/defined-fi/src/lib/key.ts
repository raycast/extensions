import { getPreferenceValues, LocalStorage } from "@raycast/api";

// Key storage. Never log the key or include it in an error message.

const STORAGE_KEY = "codexApiKey";

/** The key from the optional "Codex API Key" preference, if one is set. */
export function getPreferenceApiKey(): string | undefined {
  const { apiKey } = getPreferenceValues<{ apiKey?: string }>();
  const trimmed = apiKey?.trim();
  return trimmed ? trimmed : undefined;
}

/** The key to use: the preference wins, then the key saved during setup. */
export async function getApiKey(): Promise<string | undefined> {
  const fromPreference = getPreferenceApiKey();
  if (fromPreference) return fromPreference;
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  const trimmed = typeof stored === "string" ? stored.trim() : "";
  return trimmed ? trimmed : undefined;
}

export async function saveApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Cannot save an empty API key");
  await LocalStorage.setItem(STORAGE_KEY, trimmed);
}
