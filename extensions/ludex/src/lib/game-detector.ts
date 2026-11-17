import { Cache } from "@raycast/api";
import { detectSteamGames } from "./detectors/steam";
import { detectGogGames } from "./detectors/gog";
import { detectEpicGames } from "./detectors/epic";
import { detectXboxGames } from "./detectors/xbox";
import type { InstalledGame } from "./types";

const GAMES_CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_GAMES = "installed-games-v4";
const CACHE_KEY_GAMES_TIMESTAMP = "installed-games-v4-timestamp";
const cache = new Cache({ capacity: 2 * 1024 * 1024 });

function isCacheValid(): boolean {
  const ts = cache.get(CACHE_KEY_GAMES_TIMESTAMP);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < GAMES_CACHE_MAX_AGE_MS;
}

async function detect(): Promise<InstalledGame[]> {
  const results = await Promise.allSettled([
    detectSteamGames(),
    detectGogGames(),
    detectEpicGames(),
    detectXboxGames(),
  ]);

  const games: InstalledGame[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      games.push(...result.value);
    }
    // Silently ignore stores that failed to detect
  }

  return games;
}

export async function detectInstalledGames(
  forceRefresh = false,
): Promise<InstalledGame[]> {
  if (!forceRefresh && isCacheValid()) {
    const cached = cache.get(CACHE_KEY_GAMES);
    if (cached) return JSON.parse(cached) as InstalledGame[];
  }

  const games = await detect();
  cache.set(CACHE_KEY_GAMES, JSON.stringify(games));
  cache.set(CACHE_KEY_GAMES_TIMESTAMP, Date.now().toString());
  return games;
}
