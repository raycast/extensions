import { STEAM_HEADERS } from "../constants";
import { formatNum } from "../utils";

let ownedGames: Map<number, number> | null = null;
let ownedFetchPromise: Promise<Map<number, number>> | null = null;

export async function fetchOwnedGames(
  apiKey: string,
  steamId: string,
): Promise<Map<number, number>> {
  if (!apiKey || !steamId) return new Map();
  if (ownedGames !== null) return ownedGames;
  if (ownedFetchPromise !== null) return ownedFetchPromise;

  ownedFetchPromise = fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_played_free_games=1&include_play_time=1&format=json`,
  )
    .then((r) => r.json())
    .then((data: unknown) => {
      const d = data as {
        response?: { games?: { appid: number; playtime_forever: number }[] };
      };
      const map = new Map<number, number>(
        (d?.response?.games ?? []).map((g) => [g.appid, g.playtime_forever]),
      );
      ownedGames = map;
      return map;
    })
    .catch(() => {
      ownedFetchPromise = null;
      return new Map<number, number>();
    });

  return ownedFetchPromise;
}

export function getOwnedGames(): Map<number, number> | null {
  return ownedGames;
}

let wishlistAppIds: Set<number> | null = null;
let wishlistFetchPromise: Promise<Set<number>> | null = null;

export interface RecentlyPlayedGame {
  appid: number;
  name: string;
  playtime_2weeks: number;
  playtime_forever: number;
  img_icon_url: string;
}

let recentlyPlayedCache: RecentlyPlayedGame[] | null = null;
let recentlyPlayedPromise: Promise<RecentlyPlayedGame[]> | null = null;

export async function fetchRecentlyPlayed(
  apiKey: string,
  steamId: string,
): Promise<RecentlyPlayedGame[]> {
  if (!apiKey || !steamId) return [];
  if (recentlyPlayedCache !== null) return recentlyPlayedCache;
  if (recentlyPlayedPromise !== null) return recentlyPlayedPromise;

  recentlyPlayedPromise = fetch(
    `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=10&format=json`,
  )
    .then((r) => r.json())
    .then((data: unknown) => {
      const d = data as { response?: { games?: RecentlyPlayedGame[] } };
      const games = d?.response?.games ?? [];
      recentlyPlayedCache = games;
      return games;
    })
    .catch(() => {
      recentlyPlayedPromise = null;
      return [];
    });

  return recentlyPlayedPromise;
}

export async function fetchWishlist(
  apiKey: string,
  steamId: string,
): Promise<Set<number>> {
  if (!apiKey || !steamId) return new Set();
  if (wishlistAppIds !== null) return wishlistAppIds;
  if (wishlistFetchPromise !== null) return wishlistFetchPromise;

  wishlistFetchPromise = fetch(
    `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${apiKey}&steamid=${steamId}`,
  )
    .then((r) => r.json())
    .then((data: unknown) => {
      const d = data as { response?: { items?: { appid: number }[] } };
      const ids = new Set<number>(
        (d?.response?.items ?? []).map((g) => g.appid),
      );
      wishlistAppIds = ids;
      return ids;
    })
    .catch(() => {
      wishlistFetchPromise = null;
      return new Set<number>();
    });

  return wishlistFetchPromise;
}

export function getWishlist(): Set<number> | null {
  return wishlistAppIds;
}

export async function fetchSteamChartsData(
  appId: number,
  signal: AbortSignal,
): Promise<{ peak24h: string; peakAllTime: string } | null> {
  try {
    const res = await fetch(`https://steamcharts.com/app/${appId}`, {
      headers: STEAM_HEADERS,
      signal,
    });
    const html = await res.text();
    const matches = html.match(
      /id="app-heading"[\s\S]*?<\/div>\s*<\/div>/,
    )?.[0];
    const nums =
      matches
        ?.match(/<span class="num">(\d+)<\/span>/g)
        ?.map((s) => parseInt(s.replace(/<[^>]+>/g, ""), 10)) ?? [];
    if (nums.length >= 3) {
      return { peak24h: formatNum(nums[1]), peakAllTime: formatNum(nums[2]) };
    }
    return null;
  } catch {
    return null;
  }
}

// Steam does not expose a stable API endpoint for the small square app icon
// without a per-game hash that must be scraped anyway. The store page scrape
// is intentional — tiny_image from the search result is used as a fallback
// if scraping fails, so the extension degrades gracefully.
export async function fetchAppIcon(
  appId: number,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(`https://store.steampowered.com/app/${appId}`, {
      headers: STEAM_HEADERS,
      signal,
    });
    const html = await res.text();

    const patterns = [
      /class="apphub_AppIcon"><img src="([^"]+)"/,
      /apphub_AppIcon[^>]*>[\s]*<img[^>]*src="([^"]+)"/,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }

    const hashMatch = html.match(
      new RegExp(
        `steamcommunity/public/images/apps/${appId}/([a-f0-9]{40})\\.jpg`,
      ),
    );
    if (hashMatch?.[1]) {
      return `https://cdn.fastly.steamstatic.com/steamcommunity/public/images/apps/${appId}/${hashMatch[1]}.jpg`;
    }

    return null;
  } catch {
    return null;
  }
}
