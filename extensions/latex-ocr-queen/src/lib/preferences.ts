export type Provider = "siliconflow" | "minimax" | "openai" | "custom";
export type ImageSourceMode = "capture" | "auto" | "finder" | "clipboard";
export type OutputMode = "latex" | "inline" | "display";

export interface Preferences {
  provider?: Provider;
  imageSource?: ImageSourceMode;
  outputMode?: OutputMode;
  siliconflowApiToken?: string;
  minimaxApiToken?: string;
  openaiApiToken?: string;
  customApiToken?: string;
  customBaseUrl?: string;
  model?: string;
  temperature?: string;
  maxTokens?: string;
}

export interface RuntimeConfig {
  provider: Provider;
  providerTitle: string;
  baseUrl: string;
  model: string;
  fallbackModels: string[];
  apiToken: string;
  temperature: number;
  maxTokens: number;
}

interface ProviderDefinition {
  title: string;
  baseUrl: string;
  defaultModel: string;
  fallbackModels?: string[];
  tokenPreference: keyof Preferences;
  tokenEnvironmentNames: string[];
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

const PROVIDERS: Record<Provider, ProviderDefinition> = {
  siliconflow: {
    title: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "Qwen/Qwen3-VL-32B-Instruct",
    fallbackModels: [
      "Qwen/Qwen3-VL-8B-Instruct",
      "Qwen/Qwen3-VL-30B-A3B-Instruct",
      "Qwen/Qwen2-VL-72B-Instruct",
    ],
    tokenPreference: "siliconflowApiToken",
    tokenEnvironmentNames: ["SILICONFLOW_API_TOKEN", "SILICONFLOW_API_KEY"],
  },
  minimax: {
    title: "MiniMax",
    baseUrl: "https://api.minimax.io/v1",
    defaultModel: "MiniMax-M3",
    tokenPreference: "minimaxApiToken",
    tokenEnvironmentNames: [
      "MINIMAX_API_TOKEN",
      "MINIMAX_API_KEY",
      "MINIMAX_SUBSCRIPTION_KEY",
    ],
  },
  openai: {
    title: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    tokenPreference: "openaiApiToken",
    tokenEnvironmentNames: ["OPENAI_API_TOKEN", "OPENAI_API_KEY"],
  },
  custom: {
    title: "Custom",
    baseUrl: "",
    defaultModel: "Qwen/Qwen2.5-VL-72B-Instruct",
    tokenPreference: "customApiToken",
    tokenEnvironmentNames: ["CUSTOM_API_TOKEN"],
  },
};

export function buildRuntimeConfig(preferences: Preferences): RuntimeConfig {
  const provider = preferences.provider ?? "siliconflow";
  const definition = PROVIDERS[provider];
  const baseUrl = normalizeBaseUrl(
    resolveBaseUrl(provider, definition, preferences),
  );
  const configuredModel = nonEmptyString(preferences.model);
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
    provider,
    providerTitle: definition.title,
    baseUrl,
    model,
    fallbackModels: configuredModel
      ? []
      : (definition.fallbackModels ?? []).filter(
          (fallbackModel) => fallbackModel !== model,
        ),
    apiToken,
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

function resolveBaseUrl(
  provider: Provider,
  definition: ProviderDefinition,
  preferences: Preferences,
): string {
  if (provider !== "custom") {
    return definition.baseUrl;
  }

  const customBaseUrl = nonEmptyString(preferences.customBaseUrl);
  if (!customBaseUrl) {
    throw new ConfigurationError(
      "Custom provider needs a Base URL in Raycast preferences.",
    );
  }

  return customBaseUrl;
}

function resolveApiToken(
  preferences: Preferences,
  definition: ProviderDefinition,
): string {
  const tokenFromPreferences = nonEmptyString(
    preferences[definition.tokenPreference],
  );
  if (tokenFromPreferences) {
    return tokenFromPreferences;
  }

  for (const environmentName of definition.tokenEnvironmentNames) {
    const token = nonEmptyString(process.env[environmentName]);
    if (token) {
      return token;
    }
  }

  throw new ConfigurationError(
    `${definition.title} token is missing. Set ${definition.tokenEnvironmentNames[0]} or add it in Raycast preferences.`,
  );
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
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

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
