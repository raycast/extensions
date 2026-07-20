import fetch from "node-fetch";
import type { SongLink, SongLinkApiResponse } from "./types";
import { getProviders } from "./store";

/**
 * Checks if a URL matches any supported music provider pattern
 * @param potentialSongUrl - The URL to check
 * @returns True if the URL matches a supported music provider pattern
 */
export async function matchesSongUrlLink(potentialSongUrl: string | undefined): Promise<boolean> {
  if (potentialSongUrl === undefined) {
    return false;
  }
  const providers = await getProviders();
  // Check all providers (enabled or not) to detect if URL is valid
  // We still want to convert URLs from disabled providers to enabled ones
  return providers.some((provider) => provider.urlPatterns.some((pattern) => potentialSongUrl.startsWith(pattern)));
}

/**
 * Converts API response to a list of song links, filtering to only enabled providers
 * @param songLinks - The API response from song.link
 * @returns Array of song links for enabled providers
 */
export async function apiResponseToSongLinksList(songLinks: SongLinkApiResponse): Promise<SongLink[]> {
  const array = Array<SongLink>();
  const links = songLinks.linksByPlatform;
  if (songLinks.linksByPlatform == null) {
    return array;
  }

  const providers = await getProviders();

  // Map providers from storage to song links (only enabled providers)
  providers.forEach((provider) => {
    if (provider.enabled) {
      const link = links?.[provider.key];
      if (link != null) {
        array.push({ label: provider.label, link });
      }
    }
  });

  return array;
}

/**
 * Filters song links by provider names (case-insensitive)
 * @param songLinks - Array of song links to filter
 * @param providerNames - Array of provider names or keys to filter by
 * @returns Filtered array of song links matching the specified providers
 */
export function filterSongLinksByProviders(songLinks: SongLink[], providerNames: string[]): SongLink[] {
  if (providerNames.length === 0) {
    return songLinks;
  }

  const normalizedNames = providerNames.map((name) => name.toLowerCase().trim().replace(/\s+/g, ""));

  return songLinks.filter((songLink) => {
    const normalizedLabel = songLink.label.toLowerCase().replace(/\s+/g, "");
    return normalizedNames.some((name) => normalizedLabel.includes(name) || name.includes(normalizedLabel));
  });
}

/**
 * Fetches converted music links from the song.link API
 * @param url - The music URL to convert
 * @param filterProviders - Optional array of provider names to filter results (e.g., ["Spotify", "Apple Music"])
 * @returns Array of converted song links for enabled providers (optionally filtered)
 * @throws Error if the API request fails or URL is invalid
 */
export async function convertMusicLink(url: string, filterProviders?: string[]): Promise<SongLink[]> {
  if (!url || url.trim().length === 0) {
    throw new Error("URL is required");
  }

  const isValidUrl = await matchesSongUrlLink(url);
  if (!isValidUrl) {
    throw new Error(`Invalid music URL: ${url}. Please provide a valid music link from a supported provider.`);
  }

  const songLinksResponse = await fetch(`https://api.song.link/v1-alpha.1/links?url=${url}`);

  if (!songLinksResponse.ok) {
    const errorText = await songLinksResponse.text();
    throw new Error(`Failed to convert music link: ${songLinksResponse.status} ${errorText}`);
  }

  const songLinksData = (await songLinksResponse.json()) as SongLinkApiResponse;
  const allLinks = await apiResponseToSongLinksList(songLinksData);

  // Filter by specified providers if provided
  if (filterProviders && filterProviders.length > 0) {
    return filterSongLinksByProviders(allLinks, filterProviders);
  }

  return allLinks;
}
