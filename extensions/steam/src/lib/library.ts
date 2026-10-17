import { captureException, getPreferenceValues } from "@raycast/api";
import { GameDataSimple } from "../types";
import { steamFetch } from "./http";
import { libraryFirstSeen, recordLibrary } from "./search-index";
import { resolveOwnSteamId } from "./users";

export type LibraryGame = GameDataSimple & {
  playtime_2weeks?: number;
  rtime_last_played?: number;
};

type PlayerServiceResponse = {
  response?: {
    game_count?: number;
    total_count?: number;
    games?: LibraryGame[];
  };
};

async function credentials() {
  const { token, steamid } = getPreferenceValues<Preferences>();
  const key = token?.trim();
  const id = steamid?.trim();
  if (!key || !id) {
    throw new Error("Set your Web API Key and Steam ID in the Steam extension preferences to read your library.");
  }
  return { key, steamid: await resolveOwnSteamId(id, key) };
}

async function playerService(method: "GetOwnedGames" | "GetRecentlyPlayedGames") {
  const { key, steamid } = await credentials();
  const url = new URL(`https://api.steampowered.com/IPlayerService/${method}/v1/`);
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamid);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");
  url.searchParams.set("format", "json");

  const response = await steamFetch(url);
  if (response.status === 401 || response.status === 403) {
    throw new Error("Steam rejected the Web API Key. Check it in the Steam extension preferences.");
  }
  if (!response.ok) {
    throw new Error(`Steam could not load your library (${response.status}).`);
  }
  const body = (await response.json()) as PlayerServiceResponse;
  return {
    count: body.response?.game_count ?? body.response?.total_count,
    games: body.response?.games ?? [],
  };
}

export const libraryOwner = () => getPreferenceValues<Preferences>().steamid?.trim() ?? "";

// Records the library on every read so added dates stay current for people who only use the AI tools
export async function getOwnedGames() {
  const library = await playerService("GetOwnedGames");
  // An empty reply usually means private game details, not an empty library
  if (!library.games.length) return library;
  try {
    recordLibrary(
      libraryOwner(),
      library.games.map((game) => game.appid),
    );
  } catch (error) {
    captureException(error);
  }
  return library;
}

export function addedDates() {
  try {
    const entries = [...libraryFirstSeen(libraryOwner()).entries()];
    const baseline = entries.filter(([, entry]) => entry.baseline).map(([, entry]) => entry.firstSeen);
    return {
      since: baseline.length ? Math.min(...baseline) : undefined,
      dates: new Map(entries.filter(([, entry]) => !entry.baseline).map(([appid, entry]) => [appid, entry.firstSeen])),
    };
  } catch (error) {
    captureException(error);
    return { since: undefined, dates: new Map<number, number>() };
  }
}
export const getRecentlyPlayedGames = () => playerService("GetRecentlyPlayedGames");

// Undefined when the library can't be read, so callers can say owned games weren't checked
export async function ownedAppids() {
  const { token, steamid } = getPreferenceValues<Preferences>();
  if (!token?.trim() || !steamid?.trim()) return undefined;
  const library = await getOwnedGames().catch(() => undefined);
  return library ? new Set(library.games.map((game) => game.appid)) : undefined;
}
