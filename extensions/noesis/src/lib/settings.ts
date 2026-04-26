import { LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  ExecutionRouteTarget,
  MenuBarInsightKind,
  SelemeneClientConfig,
  SelemenePreferences,
} from "./types";
import { normalizeBaseUrl } from "./urls";

const API_KEY_STORAGE_KEY = "noesis.apiKey";
const BASE_URL_STORAGE_KEY = "noesis.baseUrl";
export const DEFAULT_BASE_URL = "https://selemene.tryambakam.space";
export const DEFAULT_PULSE_MODE: MenuBarInsightKind = "vedicClock";
export const DEFAULT_EXECUTION_ROUTE: ExecutionRouteTarget = "selemene";
export const DEFAULT_READING_HISTORY_LIMIT = 50;

export type ApiKeyStorageMode =
  | "preference"
  | "localStorage"
  | "environment"
  | "none";

export function getConfiguredPreferences(): SelemenePreferences {
  return getPreferenceValues<SelemenePreferences>();
}

export function getSecurePreferenceApiKey(): string {
  return (getConfiguredPreferences().apiKey ?? "").trim();
}

export async function getStoredApiKey(): Promise<string> {
  const preferred = getSecurePreferenceApiKey();
  if (preferred) {
    return preferred;
  }

  const legacy = await getLegacyStoredApiKey();
  if (legacy) {
    return legacy;
  }

  return (
    process.env.NOESIS_API_KEY ||
    process.env.SELEMENE_API_KEY ||
    ""
  ).trim();
}

export async function getLegacyStoredApiKey(): Promise<string> {
  return (
    (await LocalStorage.getItem<string>(API_KEY_STORAGE_KEY)) ?? ""
  ).trim();
}

export async function getApiKeyStorageMode(): Promise<ApiKeyStorageMode> {
  if (getSecurePreferenceApiKey()) {
    return "preference";
  }

  if (await getLegacyStoredApiKey()) {
    return "localStorage";
  }

  if (
    (process.env.NOESIS_API_KEY || process.env.SELEMENE_API_KEY || "").trim()
  ) {
    return "environment";
  }

  return "none";
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
  const preferences = getConfiguredPreferences();
  return normalizePulseMode(preferences.pulseMode);
}

export function getExecutionRoutePreference(): ExecutionRouteTarget {
  const preferences = getConfiguredPreferences();
  return normalizeExecutionRoute(preferences.executionRoute);
}

export function getReadingHistoryLimitPreference(): number {
  const preferences = getConfiguredPreferences();
  const parsed = Number.parseInt(preferences.readingHistoryLimit ?? "", 10);
  return parsed === 25 || parsed === 50 || parsed === 100
    ? parsed
    : DEFAULT_READING_HISTORY_LIMIT;
}

export function shouldCacheRawPayloadsPreference(): boolean {
  return Boolean(getConfiguredPreferences().cacheRawPayloads);
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
): Promise<ApiKeyStorageMode> {
  const preferred = getSecurePreferenceApiKey();
  const normalizedApiKey = config.apiKey.trim();

  if (preferred && preferred !== normalizedApiKey) {
    throw new Error(
      "The API key is managed in Extension Preferences. Update it there or remove the secure preference before saving a legacy key here.",
    );
  }

  await LocalStorage.setItem(
    BASE_URL_STORAGE_KEY,
    normalizeBaseUrl(config.baseUrl),
  );

  if (preferred) {
    await LocalStorage.removeItem(API_KEY_STORAGE_KEY);
    return "preference";
  }

  await LocalStorage.setItem(API_KEY_STORAGE_KEY, normalizedApiKey);
  return "localStorage";
}

export async function clearStoredConfig(): Promise<{
  apiKeyStorageMode: ApiKeyStorageMode;
}> {
  const apiKeyStorageMode = await getApiKeyStorageMode();
  await LocalStorage.removeItem(API_KEY_STORAGE_KEY);
  await LocalStorage.removeItem(BASE_URL_STORAGE_KEY);
  return { apiKeyStorageMode };
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

function normalizeExecutionRoute(
  value: string | undefined,
): ExecutionRouteTarget {
  switch (value) {
    case "witness":
    case "selemene":
      return value;
    default:
      return DEFAULT_EXECUTION_ROUTE;
  }
}
