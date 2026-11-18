import { LocalStorage } from "@raycast/api";
import type { ProviderConfig, PlatformLinksApiResponse } from "./types";

const PROVIDERS_STORAGE_KEY = "music_providers";

/**
 * Default providers that will be used if LocalStorage is empty
 */
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    key: "amazonMusic",
    label: "Amazon Music",
    urlPatterns: ["https://music.amazon.com/"],
    enabled: true,
  },
  {
    key: "amazonStore",
    label: "Amazon Store",
    urlPatterns: ["https://www.amazon.com/", "https://amazon.com/"],
    enabled: true,
  },
  {
    key: "anghami",
    label: "Anghami",
    urlPatterns: ["https://play.anghami.com/"],
    enabled: true,
  },
  {
    key: "deezer",
    label: "Deezer",
    urlPatterns: ["https://www.deezer.com/"],
    enabled: true,
  },
  {
    key: "appleMusic",
    label: "Apple Music",
    urlPatterns: ["https://music.apple.com/", "https://geo.music.apple.com/"],
    enabled: true,
  },
  {
    key: "itunes",
    label: "iTunes",
    urlPatterns: ["https://music.apple.com/", "https://itunes.apple.com/"],
    enabled: true,
  },
  {
    key: "soundcloud",
    label: "Soundcloud",
    urlPatterns: ["https://www.soundcloud.com/"],
    enabled: true,
  },
  {
    key: "tidal",
    label: "Tidal",
    urlPatterns: ["https://listen.tidal.com/", "https://tidal.com/"],
    enabled: true,
  },
  {
    key: "yandex",
    label: "Yandex Music",
    urlPatterns: ["https://music.yandex.ru/", "https://music.yandex.com/"],
    enabled: true,
  },
  {
    key: "youtube",
    label: "Youtube",
    urlPatterns: ["https://www.youtube.com/"],
    enabled: true,
  },
  {
    key: "youtubeMusic",
    label: "Youtube Music",
    urlPatterns: ["https://music.youtube.com/"],
    enabled: true,
  },
  {
    key: "spotify",
    label: "Spotify",
    urlPatterns: ["spotify:", "https://open.spotify.com/"],
    enabled: true,
  },
];

/**
 * Initialize LocalStorage with default providers if it doesn't exist
 */
async function initializeProviders(): Promise<void> {
  const stored = await LocalStorage.getItem(PROVIDERS_STORAGE_KEY);
  if (!stored) {
    await LocalStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(DEFAULT_PROVIDERS));
  }
}

/**
 * Get providers from LocalStorage, or return default providers if not set
 * Ensures all providers have an enabled field (defaults to true if missing)
 */
export async function getProviders(): Promise<ProviderConfig[]> {
  await initializeProviders();
  const stored = await LocalStorage.getItem(PROVIDERS_STORAGE_KEY);
  if (stored) {
    try {
      const providers = JSON.parse(stored as string) as ProviderConfig[];
      // Ensure all providers have enabled field (migration for old data)
      return providers.map((provider) => ({
        ...provider,
        enabled: provider.enabled !== undefined ? provider.enabled : true,
      }));
    } catch {
      // If parsing fails, return defaults
      return DEFAULT_PROVIDERS;
    }
  }
  return DEFAULT_PROVIDERS;
}

/**
 * Save providers to LocalStorage
 */
export async function saveProviders(providers: ProviderConfig[]): Promise<void> {
  await LocalStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
}

/**
 * Reset providers to default values
 */
export async function resetProviders(): Promise<void> {
  await saveProviders(DEFAULT_PROVIDERS);
}

/**
 * Toggle the enabled state of a provider by its key
 * @param key - The key of the provider to toggle
 * @returns The updated provider config, or null if provider not found
 */
export async function toggleProvider(key: keyof PlatformLinksApiResponse): Promise<ProviderConfig | null> {
  const providers = await getProviders();
  const providerIndex = providers.findIndex((p) => p.key === key);

  if (providerIndex === -1) {
    return null;
  }

  const provider = providers[providerIndex];
  const updatedProvider: ProviderConfig = {
    ...provider,
    enabled: !(provider.enabled !== undefined ? provider.enabled : true),
  };

  providers[providerIndex] = updatedProvider;
  await saveProviders(providers);

  return updatedProvider;
}

/**
 * Enable or disable all providers
 * @param enabled - Whether to enable (true) or disable (false) all providers
 * @returns The number of providers updated
 */
export async function setAllProvidersEnabled(enabled: boolean): Promise<number> {
  const providers = await getProviders();
  const updatedProviders = providers.map((provider) => ({
    ...provider,
    enabled,
  }));
  await saveProviders(updatedProviders);
  return updatedProviders.length;
}

/**
 * Find a provider by its label (case-insensitive)
 * @param label - The label of the provider to find
 * @returns The provider config, or null if not found
 */
export async function findProviderByLabel(label: string): Promise<ProviderConfig | null> {
  const providers = await getProviders();
  const normalized = label.toLowerCase().trim();
  return (
    providers.find(
      (p) => p.label.toLowerCase() === normalized || p.label.toLowerCase().replace(/\s+/g, "") === normalized,
    ) || null
  );
}
