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
import { fetchAppIcon, fetchWishlist } from "../api/steam";
import { batchFetchGGDeals, ggDealsCache } from "../api/ggdeals";
import { WISHLIST_CACHE_TTL } from "../constants";
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

interface PriceEntry {
  name: string;
  discountPct: number;
  steamPrice: string | null;
  steamOriginalPrice: string | null;
}

interface WishlistResult {
  games: WishlistGame[];
  unavailable: "rate-limited" | null;
}

const discountedGamesCacheMap = new Map<string, WishlistResult>();
const discountedGamesFetchPromises = new Map<string, Promise<WishlistResult>>();

async function fetchWishlistPrices(
  appIds: number[],
  region: string,
  signal?: AbortSignal,
): Promise<{
  entries: Map<number, PriceEntry>;
  unavailable: "rate-limited" | null;
}> {
  const entries = new Map<number, PriceEntry>();
  // IStoreBrowseService/GetItems/v1 is a batch endpoint on api.steampowered.com
  // that is NOT subject to the per-IP store endpoint limit (~200 req/5 min).
  // The endpoint is public (no key required); use GET with input_json in the
  // query string — the same method used by known working implementations.
  // 100 IDs per request; a 200-game wishlist is just 2 requests total.
  const BATCH_SIZE = 100;

  for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;
    const batch = appIds.slice(i, i + BATCH_SIZE);
    const inputJson = JSON.stringify({
      ids: batch.map((appid) => ({ appid })),
      context: {
        language: "english",
        country_code: region.toUpperCase(),
        steam_realm: "1",
      },
      data_request: {
        include_all_purchase_options: true,
      },
    });

    try {
      const res = await fetch(
        `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(inputJson)}`,
        { signal },
      );
      if (res.status === 429) return { entries, unavailable: "rate-limited" };
      if (!res.ok) continue;

      const data = (await res.json()) as {
        response?: {
          store_items?: {
            appid: number;
            name?: string;
            purchase_options?: {
              bundleid?: number;
              discount_pct?: number;
              final_price?: number;
              formatted_final_price?: string;
              formatted_original_price?: string;
            }[];
          }[];
        };
      };

      for (const item of data.response?.store_items ?? []) {
        const options = item.purchase_options ?? [];
        const standalone = options.find((o) => !o.bundleid);

        // Prefer a directly discounted standalone game. Only fall back to a
        // bundle if its price is strictly less than the standalone's current
        // price — a bundle that costs MORE than buying the game alone is not
        // a deal worth surfacing (e.g. a multi-game bundle at 44€ when the
        // standalone is 39€).
        const option =
          options.find((o) => !o.bundleid && (o.discount_pct ?? 0) > 0) ??
          options.find(
            (o) =>
              !!o.bundleid &&
              (o.discount_pct ?? 0) > 0 &&
              standalone?.final_price != null &&
              (o.final_price ?? Infinity) < standalone.final_price,
          );

        if (!option) continue;
        entries.set(item.appid, {
          name: item.name ?? `App ${item.appid}`,
          discountPct: option.discount_pct!,
          steamPrice: option.formatted_final_price ?? null,
          steamOriginalPrice: option.formatted_original_price ?? null,
        });
      }
    } catch {
      // Ignore batch failures
    }
  }

  return { entries, unavailable: null };
}

async function loadCachedGames(
  steamId: string,
  region: string,
  ggDealsApiKey: string,
): Promise<WishlistResult | null> {
  try {
    const raw = await LocalStorage.getItem<string>(
      `wishlist-discounts-${steamId}-${region}-${ggDealsApiKey.slice(-8)}`,
    );
    if (!raw) return null;
    const { games, timestamp }: { games: WishlistGame[]; timestamp: number } =
      JSON.parse(raw);
    if (Date.now() - timestamp > WISHLIST_CACHE_TTL) return null;
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
      `wishlist-discounts-${steamId}-${region}-${ggDealsApiKey.slice(-8)}`,
      JSON.stringify({ games, timestamp: Date.now() }),
    );
  } catch {
    // Silently ignore persistence errors
  }
}

export function fetchDiscountedWishlistGames(
  steamApiKey: string,
  steamId: string,
  ggDealsApiKey: string,
  region: string,
  signal?: AbortSignal,
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

    // Use the authenticated IWishlistService API for IDs — avoids the
    // unauthenticated wishlistdata scraping endpoint that Steam rate-limits.
    const wishlistIds = await fetchWishlist(steamApiKey, steamId);
    if (!wishlistIds.size) {
      discountedGamesFetchPromises.delete(cacheKey);
      return { games: [], unavailable: null };
    }
    if (signal?.aborted) {
      discountedGamesFetchPromises.delete(cacheKey);
      return { games: [], unavailable: null };
    }

    const { entries: priceData, unavailable } = await fetchWishlistPrices(
      Array.from(wishlistIds),
      region,
      signal,
    );
    if (signal?.aborted) {
      discountedGamesFetchPromises.delete(cacheKey);
      return { games: [], unavailable: null };
    }
    if (unavailable !== null) {
      // Cache error results in memory only — not in LocalStorage — so the next
      // session retries once the rate limit clears.
      const errorResult: WishlistResult = { games: [], unavailable };
      discountedGamesCacheMap.set(cacheKey, errorResult);
      discountedGamesFetchPromises.delete(cacheKey);
      return errorResult;
    }
    if (!priceData.size) {
      discountedGamesFetchPromises.delete(cacheKey);
      return { games: [], unavailable: null };
    }

    const allIds = Array.from(priceData.keys());
    if (ggDealsApiKey) {
      for (let i = 0; i < allIds.length; i += 50) {
        await batchFetchGGDeals(allIds.slice(i, i + 50), ggDealsApiKey, region);
      }
    }

    const games: WishlistGame[] = [];
    for (const [appid, entry] of priceData.entries()) {
      games.push({
        appid,
        name: entry.name,
        iconUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_sm_120.jpg`,
        steamPrice: entry.steamPrice,
        steamOriginalPrice: entry.steamOriginalPrice,
        discountPercent: entry.discountPct,
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
  const [unavailable, setUnavailable] = useState<"rate-limited" | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    showToast({
      style: Toast.Style.Animated,
      title: "Loading wishlist discounts…",
    });

    fetchDiscountedWishlistGames(
      steamApiKey ?? "",
      steamId ?? "",
      ggDealsApiKey ?? "",
      region,
      controller.signal,
    )
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
        } else {
          showToast({
            style: Toast.Style.Success,
            title: `${g.length} discounted games found`,
          });
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load wishlist",
        });
        setIsLoading(false);
      });

    return () => controller.abort();
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
              abortRef.current?.abort();
              const controller = new AbortController();
              abortRef.current = controller;
              discountedGamesCacheMap.delete(
                `${steamId ?? ""}-${region}-${ggDealsApiKey ?? ""}`,
              );
              discountedGamesFetchPromises.delete(
                `${steamId ?? ""}-${region}-${ggDealsApiKey ?? ""}`,
              );
              await LocalStorage.removeItem(
                `wishlist-discounts-${steamId ?? ""}-${region}-${(ggDealsApiKey ?? "").slice(-8)}`,
              );
              setIsLoading(true);
              setGames([]);
              setUnavailable(null);
              fetchDiscountedWishlistGames(
                steamApiKey ?? "",
                steamId ?? "",
                ggDealsApiKey ?? "",
                region,
                controller.signal,
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
