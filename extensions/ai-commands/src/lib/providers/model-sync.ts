import { CustomModel, CustomProvider } from "./types";

interface OpenAIModel {
  id?: unknown;
  owned_by?: unknown;
  context_length?: unknown;
  max_input_tokens?: unknown;
  capabilities?: unknown;
}

interface OpenAIModelsResponse {
  data?: unknown;
}

function hasCapability(model: OpenAIModel, ...names: string[]): boolean {
  if (!model.capabilities || typeof model.capabilities !== "object" || Array.isArray(model.capabilities)) {
    return false;
  }

  const capabilities = model.capabilities as Record<string, unknown>;
  return names.some((name) => capabilities[name] === true);
}

export function getModelsEndpoint(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("Provider base URL is required");
  }
  const root = normalized.endsWith("/chat/completions") ? normalized.slice(0, -"/chat/completions".length) : normalized;
  return `${root}/models`;
}

/**
 * Resolves API key value. If value matches an environment variable name, returns that env var.
 */
export function resolveApiKey(keyValue?: string): string | undefined {
  if (!keyValue) return undefined;
  const trimmed = keyValue.trim();
  if (!trimmed) return undefined;
  if (process.env[trimmed]) {
    return process.env[trimmed];
  }
  return trimmed;
}

/**
 * Gets API key for a provider, optionally looking up a specific model key
 */
export function getProviderApiKey(provider: CustomProvider, modelKey?: string): string | undefined {
  if (!provider.api_keys) {
    return undefined;
  }

  if (modelKey && provider.api_keys[modelKey]) {
    return resolveApiKey(provider.api_keys[modelKey]);
  }

  const preferredKey = provider.api_keys[provider.id];
  if (preferredKey) {
    return resolveApiKey(preferredKey);
  }

  const defaultKey = provider.api_keys["default"];
  if (defaultKey) {
    return resolveApiKey(defaultKey);
  }

  const firstKey = Object.values(provider.api_keys).find((value) => value && value.trim().length > 0);
  return resolveApiKey(firstKey);
}

export function mapOpenAIModel(model: OpenAIModel, provider: CustomProvider): CustomModel | null {
  if (typeof model.id !== "string" || !model.id.trim()) {
    return null;
  }

  const id = model.id.trim();
  const owner = typeof model.owned_by === "string" && model.owned_by ? ` (${model.owned_by})` : "";
  const contextCandidates = [model.context_length, model.max_input_tokens];
  const context = contextCandidates.find((value): value is number => typeof value === "number" && value > 0) ?? 128000;

  return {
    id,
    name: id,
    provider: provider.id,
    description: `${id} via ${provider.name}${owner}`,
    context,
    abilities: {
      temperature: { supported: true },
      vision: { supported: hasCapability(model, "vision", "image_input") },
      system_message: { supported: true },
      tools: { supported: hasCapability(model, "tool_calling", "tools") },
      reasoning_effort: { supported: hasCapability(model, "reasoning", "thinking") },
    },
  };
}

export function parseModelsResponse(payload: unknown, provider: CustomProvider): CustomModel[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The models endpoint returned an invalid response");
  }

  const data = (payload as OpenAIModelsResponse).data;
  if (!Array.isArray(data)) {
    throw new Error("The models endpoint response does not contain a data array");
  }

  const models = data
    .map((model) =>
      model && typeof model === "object" && !Array.isArray(model) ? mapOpenAIModel(model, provider) : null,
    )
    .filter((model): model is CustomModel => model !== null);

  if (models.length === 0) {
    throw new Error("The models endpoint returned no usable model IDs");
  }

  return models;
}

export async function fetchProviderModels(provider: CustomProvider, signal?: AbortSignal): Promise<CustomModel[]> {
  const apiKey = getProviderApiKey(provider);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const timeout = AbortSignal.timeout(15_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetch(getModelsEndpoint(provider.base_url), { headers, signal: requestSignal });
  if (!response.ok) {
    throw new Error(`Models request failed (${response.status} ${response.statusText})`);
  }

  return parseModelsResponse(await response.json(), provider);
}
