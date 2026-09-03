import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { LocalStorage } from "@raycast/api";
import { CustomProvider } from "./types";

export const PROVIDERS_FILE_PATH = path.join(process.env.HOME || "", ".config", "raycast", "ai", "providers.yaml");

const SETTINGS_KEY = "settings_custom_providers";

// In-memory cache for fast synchronous access
let cachedProviders: CustomProvider[] = [];

/**
 * Reads providers from ~/.config/raycast/ai/providers.yaml if it exists (READ-ONLY).
 */
export function readYamlProviders(): CustomProvider[] {
  if (!fs.existsSync(PROVIDERS_FILE_PATH)) {
    return [];
  }

  try {
    const fileContent = fs.readFileSync(PROVIDERS_FILE_PATH, "utf-8");
    const data = YAML.parse(fileContent);

    if (data && Array.isArray(data.providers)) {
      return data.providers.filter((p: CustomProvider) => p && typeof p === "object" && p.id);
    }
  } catch (error) {
    console.error("Failed to read providers.yaml:", error);
  }

  return [];
}

/**
 * Checks if the raycast providers.yaml file exists
 */
export function hasYamlFile(): boolean {
  return fs.existsSync(PROVIDERS_FILE_PATH);
}

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
  cachedProviders = stored;
  return stored;
}

/**
 * Saves custom providers to Raycast LocalStorage (does NOT write to YAML file)
 */
export async function saveCustomProviders(providers: CustomProvider[]): Promise<void> {
  cachedProviders = providers;
  await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(providers));
}

/**
 * Explicitly imports providers from ~/.config/raycast/ai/providers.yaml into settings.
 * Only called on explicit user action.
 */
export async function importFromYaml(): Promise<number> {
  const yamlProviders = readYamlProviders();
  if (yamlProviders.length === 0) {
    return 0;
  }

  const current = await getStoredCustomProviders();
  const currentMap = new Map(current.map((p) => [p.id, p]));

  for (const yp of yamlProviders) {
    const existing = currentMap.get(yp.id);
    if (!existing) {
      current.push(yp);
    } else {
      // Merge models if provider already exists in settings
      const modelMap = new Map<string, (typeof yp.models)[0]>();
      for (const m of existing.models || []) {
        if (m?.id) modelMap.set(m.id, m);
      }
      for (const m of yp.models || []) {
        if (m?.id) modelMap.set(m.id, m);
      }
      existing.models = Array.from(modelMap.values());
      // Copy API keys from YAML if not already set in settings
      if (yp.api_keys && (!existing.api_keys || Object.keys(existing.api_keys).length === 0)) {
        existing.api_keys = yp.api_keys;
      }
      if (!existing.base_url && yp.base_url) {
        existing.base_url = yp.base_url;
      }
    }
  }

  await saveCustomProviders(current);
  return yamlProviders.length;
}

/**
 * Returns cached providers synchronously from in-memory cache
 */
export function getCachedProviders(): CustomProvider[] {
  return cachedProviders;
}
