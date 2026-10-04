import { Cache } from "@raycast/api";

const artworkCache = new Cache({ namespace: "music-artwork" });

/**
 * Returns synchronously cached artwork URL if available (0ms delay).
 */
export function getCachedTrackArtwork(track: {
  name: string;
  artist: string;
  album?: string;
}): string | null {
  const cacheKey = `${track.artist}:::${track.name}`;
  return artworkCache.get(cacheKey) ?? null;
}

/**
 * Searches the public iTunes Search API for song artwork.
 * Returns a high-res artwork URL, or null if not found.
 */
export async function fetchArtworkFromItunes(track: {
  name: string;
  artist: string;
  album?: string;
}): Promise<string | null> {
  try {
    const cleanName = track.name.replace(/\(.*?\)|\[.*?\]/g, "").trim();
    const query = `${track.artist} ${cleanName || track.album || ""}`.trim();
    if (!query) return null;

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Array<{ artworkUrl100?: string; artworkUrl60?: string }> };
    const match = json.results?.[0];
    if (match?.artworkUrl100) {
      return match.artworkUrl100;
    }
    if (match?.artworkUrl60) {
      return match.artworkUrl60;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves artwork for the current track, returning cached URL or fetching from iTunes.
 */
export async function getTrackArtwork(track: {
  id?: string;
  name: string;
  artist: string;
  album?: string;
}): Promise<string | null> {
  const cacheKey = `${track.artist}:::${track.name}`;
  const cached = artworkCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const itunesArtwork = await fetchArtworkFromItunes(track);
  if (itunesArtwork) {
    artworkCache.set(cacheKey, itunesArtwork);
    return itunesArtwork;
  }

  return null;
}
