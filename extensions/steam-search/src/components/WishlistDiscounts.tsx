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
import { useEffect, useRef, useState } from "react";
import { fetchWishlist, fetchAppIcon } from "../api/steam";
import { batchFetchGGDeals, ggDealsCache } from "../api/ggdeals";
import { formatPlaytime } from "../utils";
import { usePlaytime } from "../hooks/usePlaytime";

interface WishlistGame {
  appid: number;
  name: string;
  iconUrl: string | null;
  steamPrice: string | null;
  steamOriginalPrice: string | null;
  discountPercent: number;
  ggPrice: string | null;
}

interface SteamAppDetailsResponse {
  success: boolean;
  data?: {
    name?: string;
    is_free?: boolean;
    price_overview?: {
      final_formatted: string;
      initial_formatted: string;
      discount_percent: number;
    };
  };
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const discountedGamesCacheMap = new Map<string, WishlistGame[]>();
const iconCache = new Map<number, string>();

async function loadCachedGames(region: string): Promise<WishlistGame[] | null> {
  try {
    const raw = await LocalStorage.getItem<string>(
      `wishlist-discounts-${region}`,
    );
    if (!raw) return null;
    const { games, timestamp }: { games: WishlistGame[]; timestamp: number } =
      JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return games;
  } catch {
    return null;
  }
}

async function saveCachedGames(
  games: WishlistGame[],
  region: string,
): Promise<void> {
  try {
    await LocalStorage.setItem(
      `wishlist-discounts-${region}`,
      JSON.stringify({ games, timestamp: Date.now() }),
    );
  } catch (e) {
    // Silently ignore persistence errors
  }
}

async function fetchDiscountedWishlistGames(
  apiKey: string,
  steamId: string,
  ggDealsApiKey: string,
  region: string,
): Promise<WishlistGame[]> {
  if (discountedGamesCacheMap.has(region))
    return discountedGamesCacheMap.get(region)!;

  const cached = await loadCachedGames(region);
  if (cached) {
    discountedGamesCacheMap.set(region, cached);
    return cached;
  }

  const wishlistIds = await fetchWishlist(apiKey, steamId);
  const ids = Array.from(wishlistIds);
  if (!ids.length) return [];

  if (ggDealsApiKey) {
    for (let i = 0; i < ids.length; i += 50) {
      await batchFetchGGDeals(ids.slice(i, i + 50), ggDealsApiKey, region);
    }
  }

  const games: WishlistGame[] = [];

  const CONCURRENCY = 10;
  const semaphore = {
    count: 0,
    async acquire() {
      while (this.count >= CONCURRENCY) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      this.count++;
    },
    release() {
      this.count--;
    },
  };

  await Promise.all(
    ids.map(async (id) => {
      await semaphore.acquire();
      try {
        const res = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${id}&cc=${region}`,
        ).catch(() => null);
        if (!res || res.status !== 200) return;

        const data = (await res.json()) as Record<
          string,
          SteamAppDetailsResponse
        >;
        const app = data?.[String(id)];
        if (!app?.success || !app.data) return;
        const d = app.data;

        const discountPercent = d.price_overview?.discount_percent ?? 0;
        if (discountPercent === 0) return;

        const ggPrice = ggDealsCache.get(`${id}-${region}`) ?? null;

        games.push({
          appid: id,
          name: d.name ?? `App ${id}`,
          iconUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/capsule_sm_120.jpg`,
          steamPrice: d.price_overview?.final_formatted ?? null,
          steamOriginalPrice: d.price_overview?.initial_formatted ?? null,
          discountPercent,
          ggPrice,
        });
      } finally {
        semaphore.release();
      }
    }),
  );

  const sorted = games.sort((a, b) => b.discountPercent - a.discountPercent);
  discountedGamesCacheMap.set(region, sorted);
  await saveCachedGames(sorted, region);
  return sorted;
}

function WishlistItem({ game }: { game: WishlistGame }) {
  const playtime = usePlaytime(game.appid);
  const isOwned = playtime !== null && playtime >= 0;
  const [iconUrl, setIconUrl] = useState<string | null>(() => iconCache.get(game.appid) ?? game.iconUrl);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (iconCache.has(game.appid)) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchAppIcon(game.appid, controller.signal).then((url) => {
      if (url && !controller.signal.aborted) {
        iconCache.set(game.appid, url);
        setIconUrl(url);
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
        ...(game.steamOriginalPrice
          ? [
              { text: { value: game.steamOriginalPrice, color: Color.SecondaryText }, tooltip: "Original price" },
              { text: { value: `→ ${game.steamPrice ?? ""}`, color: Color.Green }, tooltip: "Sale price" },
            ]
          : [
              { text: { value: game.steamPrice ?? "", color: Color.Green }, tooltip: "Sale price" },
            ]),
        ...(game.ggPrice
          ? [
              {
                text: { value: game.ggPrice, color: Color.Yellow },
                tooltip: "Lowest keyshop price on GG.deals",
              },
            ]
          : []),
        ...(isOwned
          ? [
              {
                tag: { value: formatPlaytime(playtime!), color: Color.Green },
                icon: Icon.GameController,
                tooltip: "Playtime — you already own this game",
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
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title="View on GG.deals"
            url={`https://gg.deals/steam/app/${game.appid}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "g" },
              Windows: { modifiers: ["ctrl"], key: "g" },
            }}
          />
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title="View on SteamDB"
            url={`https://steamdb.info/app/${game.appid}/charts/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
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
  const { steamApiKey, steamId, ggDealsApiKey, region } = getPreferenceValues<Preferences>();
  const [games, setGames] = useState<WishlistGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    showToast({
      style: Toast.Style.Animated,
      title: "Loading wishlist discounts…",
    });

fetchDiscountedWishlistGames(steamApiKey ?? "", steamId ?? "", ggDealsApiKey ?? "", region)
  .then((g) => {
    setGames(g);
    setIsLoading(false);
    showToast({ style: Toast.Style.Success, title: `${g.length} discounted games found` });
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
              discountedGamesCacheMap.delete(region);
              await LocalStorage.removeItem(`wishlist-discounts-${region}`);
              setIsLoading(true);
              setGames([]);
              fetchDiscountedWishlistGames(
                steamApiKey ?? "",
                steamId ?? "",
                ggDealsApiKey ?? "",
                region,
              )
                .then((g) => {
                  setGames(g);
                  setIsLoading(false);
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
      {!isLoading && games.length === 0 ? (
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
