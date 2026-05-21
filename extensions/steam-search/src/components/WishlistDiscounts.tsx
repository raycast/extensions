import {
  List,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  open,
  ActionPanel,
  Action,
  LocalStorage,
} from "@raycast/api";
import { GameDetail } from "./GameDetail";
import { useEffect, useRef, useState } from "react";
import { fetchAppIcon } from "../api/steam";
import { batchFetchGGDeals, ggDealsCache } from "../api/ggdeals";
import {
  CACHE_TTL,
  CURRENCY_SYMBOLS,
  CURRENCY_SUFFIX_REGIONS,
} from "../constants";
import { getIconUrl, setIconUrl, setCachedSubtitle } from "../cache";

interface WishlistGame {
  appid: number;
  name: string;
  iconUrl: string | null;
  steamPrice: string | null;
  steamOriginalPrice: string | null;
  discountPercent: number;
  ggPrice: string | null;
}

interface WishlistDataEntry {
  name: string;
  capsule: string;
  subs: { discount_pct: number; price?: number; original_price?: number }[];
  is_free_game: boolean;
}

interface WishlistResult {
  games: WishlistGame[];
  unavailable: "private" | "rate-limited" | null;
}

const discountedGamesCacheMap = new Map<string, WishlistResult>();
const discountedGamesFetchPromises = new Map<string, Promise<WishlistResult>>();

function formatWishlistPrice(cents: number, region: string): string {
  const symbol = CURRENCY_SYMBOLS[region] ?? "$";
  const value = (cents / 100).toFixed(2);
  return CURRENCY_SUFFIX_REGIONS.has(region)
    ? `${value}${symbol}`
    : `${symbol}${value}`;
}

async function fetchAllWishlistData(
  steamId: string,
  region: string,
): Promise<{
  entries: Map<number, WishlistDataEntry>;
  unavailable: "private" | "rate-limited" | null;
}> {
  const result = new Map<number, WishlistDataEntry>();
  for (let page = 0; page < 100; page++) {
    // Small delay between pages to avoid triggering Steam rate limits
    if (page > 0) await new Promise((resolve) => setTimeout(resolve, 150));
    const res = await fetch(
      `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=${page}&cc=${region}&l=english`,
    ).catch(() => null);
    if (!res) break;
    // 429 = explicit rate limit response
    if (res.status === 429)
      return { entries: result, unavailable: "rate-limited" };
    if (res.status !== 200) break;

    let text: string;
    try {
      text = await res.text();
    } catch {
      if (page === 0) return { entries: result, unavailable: "rate-limited" };
      break;
    }

    // Non-JSON response on page 0 = Steam returned an error page
    if (!text.trimStart().startsWith("{")) {
      if (page === 0) {
        const lower = text.toLowerCase();
        // Only mark as private if the page explicitly says so;
        // default to rate-limited for any other unexpected HTML
        const unavailable =
          lower.includes("private") ||
          lower.includes("not authorized") ||
          lower.includes("forbidden")
            ? "private"
            : "rate-limited";
        return { entries: result, unavailable };
      }
      // Later pages returning non-JSON just means end of data
      break;
    }

    let data: Record<string, WishlistDataEntry> | null = null;
    try {
      data = JSON.parse(text) as Record<string, WishlistDataEntry>;
    } catch {
      if (page === 0) return { entries: result, unavailable: "rate-limited" };
      break;
    }

    if (!data || !Object.keys(data).length) break;
    for (const [appidStr, entry] of Object.entries(data)) {
      result.set(parseInt(appidStr, 10), entry);
    }
  }
  return { entries: result, unavailable: null };
}

async function loadCachedGames(
  steamId: string,
  region: string,
  ggDealsApiKey: string,
): Promise<WishlistResult | null> {
  try {
    const raw = await LocalStorage.getItem<string>(
      `wishlist-discounts-${steamId}-${region}-${ggDealsApiKey}`,
    );
    if (!raw) return null;
    const { games, timestamp }: { games: WishlistGame[]; timestamp: number } =
      JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return { games, unavailable: null };
  } catch {
    return null;
  }
}

async function saveCachedGames(
  games: WishlistGame[],
  steamId: string,
  region: string,
  ggDealsApiKey: string,
): Promise<void> {
  try {
    await LocalStorage.setItem(
      `wishlist-discounts-${steamId}-${region}-${ggDealsApiKey}`,
      JSON.stringify({ games, timestamp: Date.now() }),
    );
  } catch {
    // Silently ignore persistence errors
  }
}

export function fetchDiscountedWishlistGames(
  steamId: string,
  ggDealsApiKey: string,
  region: string,
): Promise<WishlistResult> {
  const cacheKey = `${steamId}-${region}-${ggDealsApiKey}`;
  if (discountedGamesCacheMap.has(cacheKey))
    return Promise.resolve(discountedGamesCacheMap.get(cacheKey)!);
  if (discountedGamesFetchPromises.has(cacheKey))
    return discountedGamesFetchPromises.get(cacheKey)!;

  const promise = (async () => {
    const cached = await loadCachedGames(steamId, region, ggDealsApiKey);
    if (cached) {
      discountedGamesCacheMap.set(cacheKey, cached);
      discountedGamesFetchPromises.delete(cacheKey);
      return cached;
    }

    const { entries: wishlistData, unavailable } = await fetchAllWishlistData(
      steamId,
      region,
    );
    if (unavailable !== null) {
      // Cache error results in memory only — not in LocalStorage — so the next
      // session retries once the rate limit clears or privacy settings are fixed.
      const errorResult: WishlistResult = { games: [], unavailable };
      discountedGamesCacheMap.set(cacheKey, errorResult);
      discountedGamesFetchPromises.delete(cacheKey);
      return errorResult;
    }
    if (!wishlistData.size) {
      discountedGamesFetchPromises.delete(cacheKey);
      return { games: [], unavailable: null };
    }

    const allIds = Array.from(wishlistData.keys());
    if (ggDealsApiKey) {
      for (let i = 0; i < allIds.length; i += 50) {
        await batchFetchGGDeals(allIds.slice(i, i + 50), ggDealsApiKey, region);
      }
    }

    const games: WishlistGame[] = [];
    for (const [appid, entry] of wishlistData.entries()) {
      if (entry.is_free_game) continue;
      const sub = entry.subs?.[0];
      if (!sub || sub.discount_pct === 0) continue;

      games.push({
        appid,
        name: entry.name,
        iconUrl:
          entry.capsule ||
          `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_sm_120.jpg`,
        steamPrice:
          sub.price != null ? formatWishlistPrice(sub.price, region) : null,
        steamOriginalPrice:
          sub.original_price != null
            ? formatWishlistPrice(sub.original_price, region)
            : null,
        discountPercent: sub.discount_pct,
        ggPrice: ggDealsCache.get(`${appid}-${region}`) ?? null,
      });
    }

    const sorted = games.sort((a, b) => b.discountPercent - a.discountPercent);
    const result: WishlistResult = { games: sorted, unavailable: null };
    discountedGamesCacheMap.set(cacheKey, result);
    discountedGamesFetchPromises.delete(cacheKey);
    await saveCachedGames(sorted, steamId, region, ggDealsApiKey);
    return result;
  })().catch((err) => {
    discountedGamesFetchPromises.delete(cacheKey);
    throw err;
  });

  discountedGamesFetchPromises.set(cacheKey, promise);
  return promise;
}

function WishlistItem({ game }: { game: WishlistGame }) {
  const [iconUrl, setIconUrlState] = useState<string | null>(
    () => getIconUrl(game.appid) ?? game.iconUrl,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (getIconUrl(game.appid)) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchAppIcon(game.appid, controller.signal).then((url) => {
      if (url && !controller.signal.aborted) {
        setIconUrl(game.appid, url);
        setIconUrlState(url);
      }
    });
    return () => controller.abort();
  }, [game.appid]);

  return (
    <List.Item
      id={String(game.appid)}
      icon={{ source: iconUrl ?? Icon.GameController }}
      title={game.name}
      accessories={[
        {
          tag: { value: `-${game.discountPercent}%`, color: Color.Green },
          tooltip: "Steam discount",
        },
        ...(game.steamPrice
          ? [
              {
                text: { value: game.steamPrice, color: Color.Green },
                tooltip: "Sale price",
              },
            ]
          : []),
        ...(game.steamOriginalPrice
          ? [
              {
                text: {
                  value: `(${game.steamOriginalPrice})`,
                  color: Color.SecondaryText,
                },
                tooltip: "Original price",
              },
            ]
          : []),
        ...(game.ggPrice
          ? [
              { text: { value: "·", color: Color.SecondaryText } },
              {
                icon: { source: "ggdeals.png" },
                text: { value: game.ggPrice, color: Color.Green },
                tooltip: "Lowest keyshop price on GG.deals",
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Open in Steam"
            icon={Icon.Desktop}
            onAction={() => open(`steam://store/${game.appid}`)}
          />
          <Action.Push
            title="View Details"
            icon={Icon.Info}
            target={<GameDetail appId={game.appid} name={game.name} />}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "i" },
              Windows: { modifiers: ["ctrl"], key: "i" },
            }}
          />
          <Action.OpenInBrowser
            title="View on GG.deals"
            url={`https://gg.deals/steam/app/${game.appid}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "g" },
              Windows: { modifiers: ["ctrl"], key: "g" },
            }}
          />
          <Action.OpenInBrowser
            title="View on SteamDB"
            url={`https://steamdb.info/app/${game.appid}/charts/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
          />
          <Action.OpenInBrowser
            title="View on ProtonDB"
            url={`https://www.protondb.com/app/${game.appid}`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "p" },
              Windows: { modifiers: ["ctrl"], key: "p" },
            }}
          />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={`https://store.steampowered.com/app/${game.appid}`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "c" },
              Windows: { modifiers: ["ctrl"], key: "c" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function WishlistDiscounts() {
  const { steamApiKey, steamId, ggDealsApiKey, region } =
    getPreferenceValues<Preferences>();
  const [games, setGames] = useState<WishlistGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<
    "private" | "rate-limited" | null
  >(null);

  useEffect(() => {
    showToast({
      style: Toast.Style.Animated,
      title: "Loading wishlist discounts…",
    });

    fetchDiscountedWishlistGames(steamId ?? "", ggDealsApiKey ?? "", region)
      .then(({ games: g, unavailable: u }) => {
        setGames(g);
        setUnavailable(u);
        setIsLoading(false);
        if (u === "rate-limited") {
          showToast({
            style: Toast.Style.Failure,
            title: "Steam rate limit reached",
            message:
              "Too many requests. Wait a few minutes, then press Cmd/Ctrl+R to refresh.",
          });
        } else if (u === "private") {
          showToast({
            style: Toast.Style.Failure,
            title: "Wishlist unavailable",
            message:
              "Go to Steam → Edit Profile → Privacy Settings → set Game Details to Public",
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: `${g.length} discounted games found`,
          });
        }
      })
      .catch(() => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load wishlist",
        });
        setIsLoading(false);
      });
  }, [steamApiKey, steamId, ggDealsApiKey, region]);

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "r" },
              Windows: { modifiers: ["ctrl"], key: "r" },
            }}
            onAction={async () => {
              discountedGamesCacheMap.delete(
                `${steamId ?? ""}-${region}-${ggDealsApiKey ?? ""}`,
              );
              discountedGamesFetchPromises.delete(
                `${steamId ?? ""}-${region}-${ggDealsApiKey ?? ""}`,
              );
              await LocalStorage.removeItem(
                `wishlist-discounts-${steamId ?? ""}-${region}-${ggDealsApiKey ?? ""}`,
              );
              setIsLoading(true);
              setGames([]);
              setUnavailable(null);
              fetchDiscountedWishlistGames(
                steamId ?? "",
                ggDealsApiKey ?? "",
                region,
              )
                .then(({ games: g, unavailable: u }) => {
                  setGames(g);
                  setUnavailable(u);
                  setIsLoading(false);
                  if (u === null) {
                    const subtitle =
                      g.length === 1
                        ? "1 game discounted in your wishlist"
                        : `${g.length} games discounted in your wishlist`;
                    setCachedSubtitle("wishlist", subtitle);
                  }
                })
                .catch(() => {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to refresh",
                  });
                  setIsLoading(false);
                });
            }}
          />
        </ActionPanel>
      }
    >
      {!isLoading && unavailable === "rate-limited" ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="Steam rate limit reached"
          description="Too many requests were made recently. Wait a few minutes, then press Cmd/Ctrl+R to refresh."
        />
      ) : !isLoading && unavailable === "private" ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="Wishlist unavailable"
          description="Go to Steam → Edit Profile → Privacy Settings → set Game Details to Public"
        />
      ) : !isLoading && games.length === 0 ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No wishlist discounts"
          description="None of your wishlisted games are currently on sale"
        />
      ) : (
        <List.Section title="On Sale" subtitle={`${games.length} games`}>
          {games.map((game) => (
            <WishlistItem key={game.appid} game={game} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
