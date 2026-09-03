import { UiModelDetails } from "../ui/types";
import { CustomModel, CustomProvider } from "./types";
import { getCachedProviders, loadCustomProviders } from "./storage";
import { OpenAiClient } from "./openai-client";

const CUSTOM_PREFIX = "Custom: ";

/**
 * Returns formatted server display name for a custom provider
 */
export function formatCustomServerName(provider: CustomProvider): string {
  if (provider.name.startsWith(CUSTOM_PREFIX)) {
    return provider.name;
  }
  return `${CUSTOM_PREFIX}${provider.name}`;
}

/**
 * Checks whether a server string refers to a custom provider
 */
export function isCustomServer(serverName?: string): boolean {
  if (!serverName) return false;
  if (serverName.startsWith(CUSTOM_PREFIX) || serverName.startsWith("custom:")) {
    return true;
  }

  // Also check if serverName matches any custom provider id or name directly
  const providers = getCachedProviders();
  return providers.some((p) => p.id === serverName || p.name === serverName);
}

/**
 * Finds a custom provider by server name (supports "Custom: Name", "custom:id", name, or id)
 */
export async function getCustomProvider(serverName?: string): Promise<CustomProvider | undefined> {
  if (!serverName) return undefined;

  let cleaned = serverName;
  if (cleaned.startsWith(CUSTOM_PREFIX)) {
    cleaned = cleaned.substring(CUSTOM_PREFIX.length).trim();
  } else if (cleaned.startsWith("custom:")) {
    cleaned = cleaned.substring("custom:".length).trim();
  }

  const providers = await loadCustomProviders();
  return (
    providers.find((p) => p.name === cleaned || p.id === cleaned) ||
    providers.find(
      (p) => p.name.toLowerCase() === cleaned.toLowerCase() || p.id.toLowerCase() === cleaned.toLowerCase(),
    )
  );
}

/**
 * Synchronous version using in-memory cache
 */
export function getCustomProviderSync(serverName?: string): CustomProvider | undefined {
  if (!serverName) return undefined;

  let cleaned = serverName;
  if (cleaned.startsWith(CUSTOM_PREFIX)) {
    cleaned = cleaned.substring(CUSTOM_PREFIX.length).trim();
  } else if (cleaned.startsWith("custom:")) {
    cleaned = cleaned.substring("custom:".length).trim();
  }

  const providers = getCachedProviders();
  return (
    providers.find((p) => p.name === cleaned || p.id === cleaned) ||
    providers.find(
      (p) => p.name.toLowerCase() === cleaned.toLowerCase() || p.id.toLowerCase() === cleaned.toLowerCase(),
    )
  );
}

/**
 * Finds a specific model in a custom provider
 */
export function getCustomModel(provider: CustomProvider, modelId: string): CustomModel | undefined {
  if (!provider.models || !Array.isArray(provider.models)) return undefined;
  const target = modelId.trim().toLowerCase();
  return (
    provider.models.find((m) => m.id === modelId || m.name === modelId) ||
    provider.models.find((m) => m.id.trim().toLowerCase() === target || m.name.trim().toLowerCase() === target)
  );
}

/**
 * Instantiates an OpenAiClient for a custom provider
 */
export async function getCustomClient(serverName: string, modelId?: string): Promise<OpenAiClient | undefined> {
  const provider = await getCustomProvider(serverName);
  if (!provider) return undefined;

  let model = modelId ? getCustomModel(provider, modelId) : undefined;
  if (!model && modelId) {
    model = {
      id: modelId,
      name: modelId,
      context: 128000,
      abilities: {
        temperature: { supported: true },
        vision: { supported: true },
        tools: { supported: true },
        system_message: { supported: true },
      },
    };
  }
  return new OpenAiClient(provider, model);
}

/**
 * Returns models map for all custom providers, ready to merge into UI models
 */
export function getCustomModelsMap(customProviders?: CustomProvider[]): Map<string, UiModelDetails[]> {
  const map = new Map<string, UiModelDetails[]>();
  const providers = customProviders || getCachedProviders();

  for (const provider of providers) {
    const serverKey = formatCustomServerName(provider);
    const models: UiModelDetails[] = provider.models.map((model) => {
      const capabilities: string[] = ["completion"];
      if (model.abilities?.vision?.supported) {
        capabilities.push("vision");
      }
      if (model.abilities?.tools?.supported) {
        capabilities.push("tools");
      }
      if (model.abilities?.reasoning_effort?.supported) {
        capabilities.push("thinking");
      }

      return {
        name: model.id,
        capabilities,
      };
    });

    map.set(serverKey, models);
  }

  return map;
}

/**
 * Loads custom providers from storage and returns the models map
 */
export async function loadCustomModelsMap(): Promise<Map<string, UiModelDetails[]>> {
  const providers = await loadCustomProviders();
  return getCustomModelsMap(providers);
}

/**
 * Returns list of custom server names
 */
export function getCustomServerNames(customProviders?: CustomProvider[]): string[] {
  const providers = customProviders || getCachedProviders();
  return providers.map(formatCustomServerName);
}

/**
 * Loads custom providers from storage and returns server names
 */
export async function loadCustomServerNames(): Promise<string[]> {
  const providers = await loadCustomProviders();
  return getCustomServerNames(providers);
}
