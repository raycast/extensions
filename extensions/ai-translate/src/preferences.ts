import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences, PROVIDER_IDS, ProviderConfig, ProviderId } from "./types";

export const PROVIDER_TITLES: Record<ProviderId, string> = {
  deepseek: "DeepSeek",
  mimo: "Xiaomi MiMo",
  minimax: "MiniMax",
  gemini: "Gemini",
  kimi: "Kimi",
  openai: "OpenAI / ChatGPT",
};

const providerPreferenceKeys: Record<
  ProviderId,
  {
    enabled: keyof ExtensionPreferences;
    apiKey: keyof ExtensionPreferences;
    baseURL: keyof ExtensionPreferences;
    model: keyof ExtensionPreferences;
  }
> = {
  deepseek: {
    enabled: "enableDeepSeek",
    apiKey: "deepseekAPIKey",
    baseURL: "deepseekBaseURL",
    model: "deepseekModel",
  },
  mimo: {
    enabled: "enableMiMo",
    apiKey: "mimoAPIKey",
    baseURL: "mimoBaseURL",
    model: "mimoModel",
  },
  minimax: {
    enabled: "enableMiniMax",
    apiKey: "minimaxAPIKey",
    baseURL: "minimaxBaseURL",
    model: "minimaxModel",
  },
  gemini: {
    enabled: "enableGemini",
    apiKey: "geminiAPIKey",
    baseURL: "geminiBaseURL",
    model: "geminiModel",
  },
  kimi: {
    enabled: "enableKimi",
    apiKey: "kimiAPIKey",
    baseURL: "kimiBaseURL",
    model: "kimiModel",
  },
  openai: {
    enabled: "enableOpenAI",
    apiKey: "openAIAPIKey",
    baseURL: "openAIBaseURL",
    model: "openAIModel",
  },
};

export function readPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getOrderedProviderIds(preferences: ExtensionPreferences): ProviderId[] {
  const parsedOrder = (preferences.providerOrder ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(isProviderId);

  const orderedIds = uniqueProviderIds([...parsedOrder, ...PROVIDER_IDS]);
  const enabledIds = orderedIds.filter((id) => Boolean(preferences[providerPreferenceKeys[id].enabled]));

  if (enabledIds.length > 0) {
    return moveDefaultProviderFirst(enabledIds, preferences.defaultProvider);
  }

  return isProviderId(preferences.defaultProvider) ? [preferences.defaultProvider] : ["deepseek"];
}

export function getProviderConfig(id: ProviderId, preferences: ExtensionPreferences): ProviderConfig {
  const keys = providerPreferenceKeys[id];
  return {
    id,
    title: PROVIDER_TITLES[id],
    apiKey: stringValue(preferences[keys.apiKey]),
    baseURL: stringValue(preferences[keys.baseURL]),
    model: stringValue(preferences[keys.model]),
    apiProtocol: isAnthropicProvider(id) ? "anthropic" : "openai",
  };
}

export function getTimeoutMs(preferences: ExtensionPreferences): number {
  return clampNumber(Number.parseInt(preferences.requestTimeoutSeconds ?? "45", 10), 5, 180) * 1000;
}

export function getMaxOutputTokens(preferences: ExtensionPreferences): number {
  return clampNumber(Number.parseInt(preferences.maxOutputTokens ?? "4096", 10), 256, 32768);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

function isAnthropicProvider(id: ProviderId): boolean {
  return id === "deepseek" || id === "mimo" || id === "minimax" || id === "kimi";
}

function uniqueProviderIds(ids: ProviderId[]): ProviderId[] {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

function moveDefaultProviderFirst(ids: ProviderId[], defaultProvider: ProviderId): ProviderId[] {
  if (!ids.includes(defaultProvider)) {
    return ids;
  }

  return [defaultProvider, ...ids.filter((id) => id !== defaultProvider)];
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
