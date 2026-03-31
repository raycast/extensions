import { getPreferenceValues } from "@raycast/api";
import https from "https";

interface Preferences {
  tmdbApiKey?: string;
}

export interface ShowInfo {
  id: number;
  name: string;
  firstAirDate: string;
  seasons: SeasonInfo[];
}

export interface SeasonInfo {
  seasonNumber: number;
  episodeCount: number;
  name: string;
}

export interface EpisodeInfo {
  episodeNumber: number;
  seasonNumber: number;
  name: string;
}

const TMDB_BASE = "https://api.themoviedb.org/3";

function getApiKey(): string | null {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return prefs.tmdbApiKey?.trim() || null;
  } catch {
    return null;
  }
}

export function hasTmdbKey(): boolean {
  return getApiKey() !== null;
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`TMDB API error: ${res.statusCode} — ${data}`));
        } else {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Request timeout"));
    });
  });
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("TMDB API key not configured");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const raw = await httpsGet(url.toString());
  return JSON.parse(raw) as T;
}

/**
 * Search for a TV show by name.
 */
export async function searchShow(query: string): Promise<ShowInfo[]> {
  const data = await tmdbFetch<{
    results: Array<{
      id: number;
      name: string;
      first_air_date?: string;
    }>;
  }>("/search/tv", { query });

  return data.results.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.name,
    firstAirDate: r.first_air_date || "",
    seasons: [],
  }));
}

/**
 * Get all episodes for a show and build a map: absolute episode number -> { season, episode, name }.
 */
export async function buildEpisodeMap(
  showId: number,
): Promise<Map<number, { season: number; episode: number; name: string }>> {
  // First get show details to know the seasons
  const show = await tmdbFetch<{
    id: number;
    name: string;
    seasons: Array<{
      season_number: number;
      episode_count: number;
    }>;
  }>(`/tv/${showId}`);

  const map = new Map<number, { season: number; episode: number; name: string }>();
  let absoluteEp = 1;

  // Filter out specials (season 0) and sort by season number
  const seasons = show.seasons.filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number);

  for (const season of seasons) {
    // Fetch each season's episodes
    const seasonData = await tmdbFetch<{
      episodes: Array<{
        episode_number: number;
        season_number: number;
        name: string;
      }>;
    }>(`/tv/${showId}/season/${season.season_number}`);

    for (const ep of seasonData.episodes) {
      map.set(absoluteEp, {
        season: ep.season_number,
        episode: ep.episode_number,
        name: ep.name || `Episode ${ep.episode_number}`,
      });
      absoluteEp++;
    }
  }

  return map;
}
