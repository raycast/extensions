import { STEAM_HEADERS } from "../constants";
import { formatNum } from "../utils";

let ownedAppIds: Set<number> | null = null;
let ownedFetchPromise: Promise<Set<number>> | null = null;

export async function fetchOwnedGames(apiKey: string, steamId: string): Promise<Set<number>> {
  if (!apiKey || !steamId) {
    ownedAppIds = new Set();
    return ownedAppIds;
  }
  if (ownedAppIds !== null) return ownedAppIds;
  if (ownedFetchPromise !== null) return ownedFetchPromise;

  ownedFetchPromise = fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&format=json`
  )
    .then((r) => r.json())
    .then((data: unknown) => {
      const d = data as { response?: { games?: { appid: number }[] } };
      const ids = new Set<number>(
        (d?.response?.games ?? []).map((g) => g.appid)
      );
      ownedAppIds = ids;
      return ids;
    })
    .catch(() => {
      ownedAppIds = new Set();
      return ownedAppIds as Set<number>;
    });

  return ownedFetchPromise;
}

export function getOwnedAppIds(): Set<number> | null {
  return ownedAppIds;
}

export async function fetchSteamChartsData(
  appId: number,
  signal: AbortSignal
): Promise<{ peak24h: string; peakAllTime: string } | null> {
  try {
    const res = await fetch(`https://steamcharts.com/app/${appId}`, {
      headers: STEAM_HEADERS,
      signal,
    });
    const html = await res.text();
    const matches = html.match(/id="app-heading"[\s\S]*?<\/div>\s*<\/div>/)?.[0];
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

export async function fetchAppIcon(appId: number, signal: AbortSignal): Promise<string | null> {
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
      new RegExp(`steamcommunity/public/images/apps/${appId}/([a-f0-9]{40})\\.jpg`)
    );
    if (hashMatch?.[1]) {
      return `https://cdn.fastly.steamstatic.com/steamcommunity/public/images/apps/${appId}/${hashMatch[1]}.jpg`;
    }

    return null;
  } catch {
    return null;
  }
}