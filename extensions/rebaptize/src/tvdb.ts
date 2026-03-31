import { getPreferenceValues } from "@raycast/api";
import https from "https";

interface Preferences {
  tvdbApiKey?: string;
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

const TVDB_BASE = "https://api4.thetvdb.com/v4";

let cachedToken: string | null = null;
let tokenExpiry = 0;

function getApiKey(): string | null {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return prefs.tvdbApiKey?.trim() || null;
  } catch {
    return null;
  }
}

export function hasTvdbKey(): boolean {
  return getApiKey() !== null;
}

/**
 * Authenticate with TVDB v4 API and get a bearer token.
 * Tokens are cached for 24 hours.
 */
function httpsRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`TVDB API error (${res.statusCode}): ${data}`));
          } else {
            resolve(data);
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Request timeout"));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getToken(): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("TVDB API key not configured");

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const raw = await httpsRequest(`${TVDB_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey }),
  });

  const data = JSON.parse(raw) as { data: { token: string } };
  cachedToken = data.data.token;
  tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return cachedToken;
}

async function tvdbFetch<T>(path: string): Promise<T> {
  const token = await getToken();

  const raw = await httpsRequest(`${TVDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = JSON.parse(raw) as { data: T };
  return json.data;
}

/**
 * Search for a TV series by name.
 */
export async function searchShow(query: string): Promise<ShowInfo[]> {
  const results = await tvdbFetch<
    Array<{
      tvdb_id?: string;
      id?: string;
      name: string;
      first_air_time?: string;
      year?: string;
      type?: string;
    }>
  >(`/search?query=${encodeURIComponent(query)}&type=series&limit=5`);

  return results.map((r) => ({
    id: parseInt(r.tvdb_id || r.id || "0"),
    name: r.name,
    firstAirDate: r.first_air_time || r.year || "",
    seasons: [],
  }));
}

/**
 * Get detailed info about a show including season breakdown.
 */
export async function getShowDetails(showId: number): Promise<ShowInfo> {
  const data = await tvdbFetch<{
    id: number;
    name: string;
    firstAired?: string;
    seasons: Array<{
      number: number;
      type: { id: number; name: string; type: string };
      episodes?: Array<unknown>;
    }>;
  }>(`/series/${showId}/extended`);

  // Filter to "Aired Order" seasons (type.type === "official" or type.id === 1) and skip specials (season 0)
  const airedSeasons = data.seasons.filter((s) => s.number > 0 && (s.type.type === "official" || s.type.id === 1));

  // We need episode counts per season — fetch each season
  const seasons: SeasonInfo[] = [];
  for (const s of airedSeasons) {
    seasons.push({
      seasonNumber: s.number,
      episodeCount: 0, // will be filled when we fetch episodes
      name: `Season ${s.number}`,
    });
  }

  return {
    id: data.id,
    name: data.name,
    firstAirDate: data.firstAired || "",
    seasons,
  };
}

/**
 * Get all episodes for a series (aired order).
 * TVDB v4 paginates at 500 per page.
 */
export async function getAllEpisodes(showId: number): Promise<EpisodeInfo[]> {
  const episodes: EpisodeInfo[] = [];
  let page = 0;

  while (true) {
    const data = await tvdbFetch<{
      series: unknown;
      episodes: Array<{
        seasonNumber: number;
        number: number;
        name?: string;
      }>;
    }>(`/series/${showId}/episodes/default?page=${page}`);

    if (!data.episodes || data.episodes.length === 0) break;

    for (const ep of data.episodes) {
      if (ep.seasonNumber === 0) continue; // skip specials
      episodes.push({
        episodeNumber: ep.number,
        seasonNumber: ep.seasonNumber,
        name: ep.name || `Episode ${ep.number}`,
      });
    }

    // TVDB returns up to 500 per page
    if (data.episodes.length < 500) break;
    page++;
  }

  return episodes.sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
}

/**
 * Build a full episode map for a show: absolute episode number -> { season, episode, name }.
 * Absolute episode 1 = first episode of season 1, etc.
 */
export async function buildEpisodeMap(
  showId: number,
): Promise<Map<number, { season: number; episode: number; name: string }>> {
  const episodes = await getAllEpisodes(showId);
  const map = new Map<number, { season: number; episode: number; name: string }>();

  let absoluteEp = 1;
  for (const ep of episodes) {
    map.set(absoluteEp, {
      season: ep.seasonNumber,
      episode: ep.episodeNumber,
      name: ep.name,
    });
    absoluteEp++;
  }

  return map;
}
