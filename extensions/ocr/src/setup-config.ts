import { LocalStorage } from "@raycast/api";

import { configurationError } from "./errors";
import { getDefaultCopyBehavior, getOpenRouterApiKey } from "./preferences";
import type {
  OcrSetupConfig,
  OpenRouterDataCollection,
  OpenRouterProviderPreferences,
  OpenRouterRequestParameters,
} from "./types";
import { DEFAULT_OPENROUTER_PARAMETERS, DEFAULT_OPENROUTER_PROVIDER } from "./types";
import { validateOpenRouterApiKeyIfChanged } from "./verify-api-key";

const SETUP_CONFIG_KEY = "ocrSetupConfig";

interface StoredSetupConfig {
  model: string;
  provider: OpenRouterProviderPreferences;
  parameters: OpenRouterRequestParameters;
}

export type SetupGate =
  | { kind: "missing_api_key" }
  | { kind: "invalid_api_key"; message: string; retryable: boolean }
  | { kind: "needs_model" }
  | { kind: "ready"; config: OcrSetupConfig };

export async function getSetupGate(): Promise<SetupGate> {
  const apiKey = await resolveApiKey();

  if (!apiKey) {
    return { kind: "missing_api_key" };
  }

  const validation = await validateOpenRouterApiKeyIfChanged(apiKey);

  if (validation.status === "missing") {
    return { kind: "missing_api_key" };
  }

  if (validation.status === "invalid") {
    return {
      kind: "invalid_api_key",
      message: validation.message,
      retryable: false,
    };
  }

  if (validation.status === "network") {
    return {
      kind: "invalid_api_key",
      message: validation.message,
      retryable: true,
    };
  }

  const storedConfig = await readStoredSetupConfig();

  if (!storedConfig) {
    return { kind: "needs_model" };
  }

  return {
    kind: "ready",
    config: {
      apiKey,
      ...storedConfig,
      defaultCopyBehavior: getDefaultCopyBehavior(),
    },
  };
}

export async function getSetupConfig(): Promise<OcrSetupConfig | undefined> {
  const gate = await getSetupGate();

  return gate.kind === "ready" ? gate.config : undefined;
}

export async function requireSetupConfig(): Promise<OcrSetupConfig> {
  const config = await getSetupConfig();

  if (!config) {
    throw configurationError("Add your OpenRouter API key in extension preferences and choose a model.");
  }

  return config;
}

export async function hasOpenRouterApiKey(): Promise<boolean> {
  return Boolean(await resolveApiKey());
}

export async function saveSetupConfig(
  config: Pick<OcrSetupConfig, "apiKey" | "model"> & {
    provider?: OpenRouterProviderPreferences;
    parameters?: OpenRouterRequestParameters;
  },
): Promise<void> {
  const normalizedConfig = normalizeSetupConfig(config);

  await LocalStorage.setItem(
    SETUP_CONFIG_KEY,
    JSON.stringify({
      model: normalizedConfig.model,
      provider: normalizedConfig.provider,
      parameters: normalizedConfig.parameters,
    } satisfies StoredSetupConfig),
  );
}

function normalizeSetupConfig(config: {
  apiKey: string;
  model: string;
  provider?: OpenRouterProviderPreferences;
  parameters?: OpenRouterRequestParameters;
}): StoredSetupConfig & { apiKey: string } {
  const apiKey = config.apiKey.trim();
  const model = config.model.trim();

  if (!apiKey) {
    throw configurationError("Add your OpenRouter API key in extension preferences.");
  }

  if (!model) {
    throw configurationError("Choose an OpenRouter model that can read images.");
  }

  return {
    apiKey,
    model,
    provider: normalizeProviderPreferences(config.provider),
    parameters: normalizeRequestParameters(config.parameters),
  };
}

async function resolveApiKey(): Promise<string> {
  const preferenceApiKey = getOpenRouterApiKey();

  if (preferenceApiKey) {
    return preferenceApiKey;
  }

  const legacyConfig = await readLegacyStoredSetupConfig();

  return legacyConfig?.apiKey.trim() ?? "";
}

async function readStoredSetupConfig(): Promise<StoredSetupConfig | undefined> {
  const storedConfig = await LocalStorage.getItem<string>(SETUP_CONFIG_KEY);

  if (!storedConfig) {
    return undefined;
  }

  try {
    const config = JSON.parse(storedConfig) as unknown;
    return parseStoredSetupConfig(config);
  } catch {
    return undefined;
  }
}

async function readLegacyStoredSetupConfig(): Promise<{ apiKey: string } | undefined> {
  const storedConfig = await LocalStorage.getItem<string>(SETUP_CONFIG_KEY);

  if (!storedConfig) {
    return undefined;
  }

  try {
    const config = JSON.parse(storedConfig) as unknown;

    if (!isRecord(config) || typeof config.apiKey !== "string") {
      return undefined;
    }

    return {
      apiKey: config.apiKey,
    };
  } catch {
    return undefined;
  }
}

function normalizeProviderPreferences(
  provider: OpenRouterProviderPreferences | undefined,
): OpenRouterProviderPreferences {
  return {
    allow_fallbacks: provider?.allow_fallbacks ?? DEFAULT_OPENROUTER_PROVIDER.allow_fallbacks,
    data_collection: provider?.data_collection ?? DEFAULT_OPENROUTER_PROVIDER.data_collection,
  };
}

function normalizeRequestParameters(parameters: OpenRouterRequestParameters | undefined): OpenRouterRequestParameters {
  const maxTokens = parameters?.max_tokens ?? DEFAULT_OPENROUTER_PARAMETERS.max_tokens;
  const temperature = parameters?.temperature ?? DEFAULT_OPENROUTER_PARAMETERS.temperature;

  if (!Number.isFinite(maxTokens) || maxTokens < 1) {
    throw configurationError("Max tokens must be at least 1.");
  }

  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw configurationError("Temperature must be between 0 and 2.");
  }

  return {
    max_tokens: Math.floor(maxTokens),
    temperature,
  };
}

function parseStoredSetupConfig(value: unknown): StoredSetupConfig | undefined {
  if (!isRecord(value) || typeof value.model !== "string") {
    return undefined;
  }

  const provider = parseProviderPreferences(value.provider);
  const parameters = parseRequestParameters(value.parameters);

  if (!provider || !parameters) {
    return undefined;
  }

  return {
    model: value.model,
    provider,
    parameters,
  };
}

function parseProviderPreferences(value: unknown): OpenRouterProviderPreferences | undefined {
  if (!isRecord(value) || typeof value.allow_fallbacks !== "boolean") {
    return undefined;
  }

  const dataCollection = parseDataCollection(value.data_collection);

  if (!dataCollection) {
    return undefined;
  }

  return {
    allow_fallbacks: value.allow_fallbacks,
    data_collection: dataCollection,
  };
}

function parseRequestParameters(value: unknown): OpenRouterRequestParameters | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.max_tokens !== "number" || typeof value.temperature !== "number") {
    return undefined;
  }

  return {
    max_tokens: value.max_tokens,
    temperature: value.temperature,
  };
}

function parseDataCollection(value: unknown): OpenRouterDataCollection | undefined {
  if (value === "allow" || value === "deny") {
    return value;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
