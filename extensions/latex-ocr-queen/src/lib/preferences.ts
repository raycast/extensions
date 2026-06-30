export type ProviderKind = "siliconflow" | "minimax" | "openai" | "compatible";
export type ImageSourceMode = "capture" | "finder" | "clipboard";
export type OutputMode = "latex" | "inline" | "display";

export type CommandPreferences = Preferences.OcrFormula;

const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";

export interface RuntimeConfig {
  providerKind: ProviderKind;
  providerTitle: string;
  baseUrl: string;
  model: string;
  fallbackModels: string[];
  apiToken: string;
  enableThinking: boolean;
  temperature: number;
  maxTokens: number;
}

interface ProviderDefinition {
  title: string;
  defaultModel: string;
  fallbackModels?: string[];
  legacyTokenPreferenceNames?: string[];
  tokenEnvironmentNames: string[];
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

const PROVIDERS: Record<ProviderKind, ProviderDefinition> = {
  siliconflow: {
    title: "SiliconFlow",
    defaultModel: "Qwen/Qwen3-VL-32B-Instruct",
    fallbackModels: [
      "Qwen/Qwen3-VL-8B-Instruct",
      "Qwen/Qwen3-VL-30B-A3B-Instruct",
      "Qwen/Qwen2-VL-72B-Instruct",
    ],
    legacyTokenPreferenceNames: ["siliconflowApiToken"],
    tokenEnvironmentNames: ["SILICONFLOW_API_TOKEN", "SILICONFLOW_API_KEY"],
  },
  minimax: {
    title: "MiniMax",
    defaultModel: "MiniMax-M3",
    tokenEnvironmentNames: [
      "MINIMAX_API_TOKEN",
      "MINIMAX_API_KEY",
      "MINIMAX_SUBSCRIPTION_KEY",
    ],
    legacyTokenPreferenceNames: ["minimaxApiToken"],
  },
  openai: {
    title: "OpenAI",
    defaultModel: "gpt-4.1-mini",
    legacyTokenPreferenceNames: ["openaiApiToken"],
    tokenEnvironmentNames: ["OPENAI_API_TOKEN", "OPENAI_API_KEY"],
  },
  compatible: {
    title: "OpenAI-compatible",
    defaultModel: "Qwen/Qwen2.5-VL-72B-Instruct",
    legacyTokenPreferenceNames: ["customApiToken"],
    tokenEnvironmentNames: ["VLM_OCR_API_TOKEN", "CUSTOM_API_TOKEN"],
  },
};

export function buildRuntimeConfig(
  preferences: CommandPreferences,
): RuntimeConfig {
  const baseUrl = normalizeBaseUrl(preferences.baseUrl);
  const providerKind = inferProviderKind(baseUrl);
  const definition = PROVIDERS[providerKind];
  const configuredModel = nonEmptyString(preferences.model);
  const enableThinking = parseBooleanPreference(
    (preferences as Record<string, unknown>).enable_thinking,
  );
  if (providerKind === "compatible" && !configuredModel) {
    throw new ConfigurationError(
      "Set Model for this Base URL. Examples: Qwen/Qwen3-VL-32B-Instruct, MiniMax-M3, gpt-4.1-mini.",
    );
  }

  const model = configuredModel ?? definition.defaultModel;
  const apiToken = resolveApiToken(preferences, definition);
  const temperature = parseNumberPreference(
    preferences.temperature,
    "Temperature",
    0,
    0,
    2,
  );
  const maxTokens = parseNumberPreference(
    preferences.maxTokens,
    "Max Tokens",
    512,
    1,
    8192,
  );

  return {
    providerKind,
    providerTitle: definition.title,
    baseUrl,
    model,
    fallbackModels: configuredModel
      ? []
      : (definition.fallbackModels ?? []).filter(
          (fallbackModel) => fallbackModel !== model,
        ),
    apiToken,
    enableThinking,
    temperature,
    maxTokens: Math.floor(maxTokens),
  };
}

export function toChatCompletionsUrl(baseUrl: string): string {
  if (baseUrl.endsWith("/chat/completions")) {
    return baseUrl;
  }

  return `${baseUrl}/chat/completions`;
}

function resolveApiToken(
  preferences: CommandPreferences,
  definition: ProviderDefinition,
): string {
  const tokenFromPreferences = nonEmptyString(preferences.apiToken);
  if (tokenFromPreferences) {
    return tokenFromPreferences;
  }

  const preferenceRecord = preferences as Record<string, unknown>;
  for (const preferenceName of definition.legacyTokenPreferenceNames ?? []) {
    const legacyToken = nonEmptyString(preferenceRecord[preferenceName]);
    if (legacyToken) {
      return legacyToken;
    }
  }

  const environmentNames = [
    ...definition.tokenEnvironmentNames,
    "VLM_OCR_API_TOKEN",
    "VLM_OCR_APITOKEN",
    "SILICONFLOW_API_TOKEN",
    "SILICONFLOW_APITOKEN",
    "SILICONFLOW_API_KEY",
    "MINIMAX_API_TOKEN",
    "MINIMAX_APITOKEN",
    "MINIMAX_API_KEY",
    "MINIMAX_SUBSCRIPTION_KEY",
    "OPENAI_API_TOKEN",
    "OPENAI_APITOKEN",
    "OPENAI_API_KEY",
    "CUSTOM_API_TOKEN",
    "CUSTOM_APITOKEN",
  ];

  for (const environmentName of new Set(environmentNames)) {
    const token = nonEmptyString(process.env[environmentName]);
    if (token) {
      return token;
    }
  }

  throw new ConfigurationError(
    `${definition.title} token is missing. Set API Token in preferences or use ${definition.tokenEnvironmentNames[0]}.`,
  );
}

function inferProviderKind(baseUrl: string): ProviderKind {
  const normalized = baseUrl.toLowerCase();
  if (normalized.includes("siliconflow")) {
    return "siliconflow";
  }

  if (normalized.includes("minimax")) {
    return "minimax";
  }

  if (normalized.includes("openai")) {
    return "openai";
  }

  return "compatible";
}

function normalizeBaseUrl(value: string): string {
  const trimmed = typeof value === "string" ? value.trim() : DEFAULT_BASE_URL;
  if (!trimmed) {
    throw new ConfigurationError("Base URL cannot be empty.");
  }

  return trimmed.replace(/\/+$/, "");
}

function parseNumberPreference(
  value: string | undefined,
  title: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const normalized = nonEmptyString(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new ConfigurationError(
      `${title} must be a number from ${minimum} to ${maximum}.`,
    );
  }

  return parsed;
}

function parseBooleanPreference(value: unknown): boolean {
  return value === true || value === "true";
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
