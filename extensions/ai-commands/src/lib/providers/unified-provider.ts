import { UiModelDetails } from "../ui/types";
import { CustomModel, CustomProvider } from "./types";
import { getCachedProviders, loadCustomProviders } from "./storage";

export function formatCustomServerName(provider: CustomProvider): string {
  return provider.name;
}

/**
 * Checks whether a server string refers to a custom provider
 */
export function isCustomServer(serverName?: string): boolean {
  if (!serverName) return false;
  const providers = getCachedProviders();
  return providers.some((p) => p.id === serverName || p.name === serverName);
}

/**
 * Finds a provider by stable ID or display name.
 */
export async function getCustomProvider(serverName?: string): Promise<CustomProvider | undefined> {
  if (!serverName) return undefined;

  const providers = await loadCustomProviders();
  return providers.find((provider) => provider.id === serverName || provider.name === serverName);
}

/**
 * Synchronous version using in-memory cache
 */
export function getCustomProviderSync(serverName?: string): CustomProvider | undefined {
  if (!serverName) return undefined;

  const providers = getCachedProviders();
  return providers.find((provider) => provider.id === serverName || provider.name === serverName);
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
