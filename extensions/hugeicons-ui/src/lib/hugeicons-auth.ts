import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { API_KEY_OVERRIDE_KEY } from "./constants";
import type { Preferences } from "./types";

function normalizeApiKey(value?: string | null): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

export function getPreferenceHugeiconsApiKey(): string | undefined {
  return normalizeApiKey(getPreferenceValues<Preferences>().apiKey);
}

export async function getStoredHugeiconsApiKey(): Promise<string | undefined> {
  return normalizeApiKey(await LocalStorage.getItem<string>(API_KEY_OVERRIDE_KEY));
}

export async function loadConfiguredHugeiconsApiKey(): Promise<string | undefined> {
  return (await getStoredHugeiconsApiKey()) ?? getPreferenceHugeiconsApiKey();
}

export async function saveHugeiconsApiKeyOverride(apiKey: string): Promise<string> {
  const normalizedApiKey = normalizeApiKey(apiKey);

  if (!normalizedApiKey) {
    throw new Error("Enter a Hugeicons API key.");
  }

  await LocalStorage.setItem(API_KEY_OVERRIDE_KEY, normalizedApiKey);
  return normalizedApiKey;
}

export async function clearHugeiconsApiKeyOverride(): Promise<void> {
  await LocalStorage.removeItem(API_KEY_OVERRIDE_KEY);
}
