import { LocalStorage } from "@raycast/api";
import { CustomProvider } from "./types";

const SETTINGS_KEY = "settings_custom_providers";
export const OLLAMA_LOCAL_PROVIDER_ID = "ollama-local";
export const OLLAMA_LOCAL_PROVIDER_NAME = "Ollama (Local)";

export function createDefaultOllamaProvider(): CustomProvider {
  return {
    id: OLLAMA_LOCAL_PROVIDER_ID,
    name: OLLAMA_LOCAL_PROVIDER_NAME,
    base_url: "http://127.0.0.1:11434/v1",
    api_kind: "openai-compatible",
    lifecycle: "ollama",
    models: [],
  };
}

// In-memory cache for fast synchronous access
let cachedProviders: CustomProvider[] = [];

/**
 * Gets custom providers stored in Raycast LocalStorage
 */
export async function getStoredCustomProviders(): Promise<CustomProvider[]> {
  try {
    const raw = await LocalStorage.getItem<string>(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading stored custom providers:", e);
  }
  return [];
}

/**
 * Loads custom providers from Raycast LocalStorage settings.
 * Does NOT look at providers.yaml automatically.
 */
export async function loadCustomProviders(): Promise<CustomProvider[]> {
  const stored = await getStoredCustomProviders();
  const hasLocalOllama = stored.some((provider) => provider.id === OLLAMA_LOCAL_PROVIDER_ID);
  const providers = hasLocalOllama ? stored : [createDefaultOllamaProvider(), ...stored];
  // The local provider is deliberately created on first use. It gives every command a
  // safe, visible default without attempting to install Ollama or download a model.
  if (!hasLocalOllama) await saveCustomProviders(providers);
  cachedProviders = providers;
  return providers;
}

/**
 * Saves custom providers to Raycast LocalStorage (does NOT write to YAML file)
 */
export async function saveCustomProviders(providers: CustomProvider[]): Promise<void> {
  cachedProviders = providers;
  await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(providers));
}

/**
 * Returns cached providers synchronously from in-memory cache
 */
export function getCachedProviders(): CustomProvider[] {
  return cachedProviders;
}
