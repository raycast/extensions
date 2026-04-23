import { LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  MenuBarInsightKind,
  SelemeneClientConfig,
  SelemenePreferences,
} from "./types";
import { normalizeBaseUrl } from "./api";

const API_KEY_STORAGE_KEY = "noesis.apiKey";
const BASE_URL_STORAGE_KEY = "noesis.baseUrl";
export const DEFAULT_BASE_URL = "https://selemene.tryambakam.space";
export const DEFAULT_PULSE_MODE: MenuBarInsightKind = "vedicClock";

export async function getStoredApiKey(): Promise<string> {
  const stored = (
    (await LocalStorage.getItem<string>(API_KEY_STORAGE_KEY)) ?? ""
  ).trim();
  if (stored) {
    return stored;
  }

  const preferences = getPreferenceValues<SelemenePreferences>();
  return (
    preferences.apiKey?.trim() ||
    process.env.NOESIS_API_KEY ||
    process.env.SELEMENE_API_KEY ||
    ""
  ).trim();
}

export async function getStoredBaseUrl(): Promise<string> {
  const stored = (
    (await LocalStorage.getItem<string>(BASE_URL_STORAGE_KEY)) ?? ""
  ).trim();
  if (stored) {
    return normalizeBaseUrl(stored);
  }

  const preferences = getPreferenceValues<SelemenePreferences>();
  return normalizeBaseUrl(
    preferences.baseUrl?.trim() ||
      process.env.NOESIS_API_BASE_URL ||
      process.env.SELEMENE_BASE_URL ||
      DEFAULT_BASE_URL,
  );
}

export function getPulseModePreference(): MenuBarInsightKind {
  const preferences = getPreferenceValues<SelemenePreferences>();
  return normalizePulseMode(preferences.pulseMode);
}

export async function getStoredConfig(): Promise<SelemeneClientConfig | null> {
  const apiKey = await getStoredApiKey();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: await getStoredBaseUrl(),
  };
}

export async function saveStoredConfig(
  config: SelemeneClientConfig,
): Promise<void> {
  await LocalStorage.setItem(API_KEY_STORAGE_KEY, config.apiKey.trim());
  await LocalStorage.setItem(
    BASE_URL_STORAGE_KEY,
    normalizeBaseUrl(config.baseUrl),
  );
}

export async function clearStoredConfig(): Promise<void> {
  await LocalStorage.removeItem(API_KEY_STORAGE_KEY);
  await LocalStorage.removeItem(BASE_URL_STORAGE_KEY);
}

function normalizePulseMode(value: string | undefined): MenuBarInsightKind {
  switch (value) {
    case "biorhythm":
    case "vimshottari":
    case "vedicClock":
      return value;
    default:
      return DEFAULT_PULSE_MODE;
  }
}
