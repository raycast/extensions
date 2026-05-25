import { getPreferenceValues } from "@raycast/api";
import { resolveModel } from "./models";
import {
  ExtensionPreferences,
  ModelTier,
  PROVIDER_IDS,
  ProviderAPIProtocol,
  ProviderConfig,
  ProviderId,
} from "./types";

export const PROVIDER_TITLES: Record<ProviderId, string> = {
  deepseek: "DeepSeek",
  mimo: "Xiaomi MiMo",
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

export function getProviderConfig(
  id: ProviderId,
  preferences: ExtensionPreferences,
  modelTier?: ModelTier,
): ProviderConfig {
  const keys = providerPreferenceKeys[id];
  const customModel = stringValue(preferences[keys.model]);
  const model = modelTier ? resolveModel(id, modelTier, customModel) : customModel;
  const baseURL = stringValue(preferences[keys.baseURL]);
  return {
    id,
    title: PROVIDER_TITLES[id],
    apiKey: stringValue(preferences[keys.apiKey]),
    baseURL,
    model,
    apiProtocol: detectProtocol(id, baseURL),
  };
}

export function getTimeoutMs(preferences: ExtensionPreferences): number {
  return clampNumber(parseInteger(preferences.requestTimeoutSeconds, 45), 5, 180) * 1000;
}

export function getMaxOutputTokens(preferences: ExtensionPreferences): number {
  return clampNumber(parseInteger(preferences.maxOutputTokens, 4096), 256, 32768);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Pick the wire protocol from the configured base URL so users can flip
 * providers between their Anthropic-compatible and OpenAI-compatible
 * endpoints without a separate preference. For Kimi this matters because the
 * Kimi Code Plan endpoint speaks Anthropic Messages while Moonshot's pay-
 * as-you-go endpoint (api.moonshot.ai / api.moonshot.cn) speaks OpenAI Chat
 * Completions.
 */
function detectProtocol(id: ProviderId, baseURL: string): ProviderAPIProtocol {
  if (id === "gemini" || id === "openai") return "openai";
  const lower = baseURL.toLowerCase();
  if (lower.includes("moonshot.")) return "openai";
  return "anthropic";
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

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
