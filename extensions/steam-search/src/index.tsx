import {
  List,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { SteamApp, SteamSearchResponse } from "./types";
import {
  fetchOwnedGames,
  fetchWishlist,
  fetchRecentlyPlayed,
  fetchTopSellers,
} from "./api/steam";
import { batchFetchGGDeals } from "./api/ggdeals";
import { getCachedSubtitle, setCachedSubtitle } from "./cache";

const FRIENDS_SUBTITLE_TTL = 2 * 60 * 1000; // 2 minutes
const RECENT_SUBTITLE_TTL = 10 * 60 * 1000; // 10 minutes
// Wishlist subtitle uses the default CACHE_TTL (1 hour) from getCachedSubtitle
import { GameItem } from "./components/GameItem";
import { Onboarding } from "./components/Onboarding";
import { RecentlyPlayed } from "./components/RecentlyPlayed";
import {
  FriendsOnline,
  fetchFriendsOnline,
  isFriendsListPrivate,
} from "./components/FriendsOnline";
import {
  WishlistDiscounts,
  fetchDiscountedWishlistGames,
} from "./components/WishlistDiscounts";

export default function Command() {
  const { steamApiKey, steamId, ggDealsApiKey, region } = getPreferenceValues();
  const [skipped, setSkipped] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(() => {
    const v = getCachedSubtitle("friends", FRIENDS_SUBTITLE_TTL);
    return v !== null ? parseInt(v, 10) : null;
  });
  const [recentSubtitle, setRecentSubtitle] = useState<string | null>(() =>
    getCachedSubtitle("recent", RECENT_SUBTITLE_TTL),
  );
  const [wishlistSubtitle, setWishlistSubtitle] = useState<string | null>(() =>
    getCachedSubtitle("wishlist"),
  );
  const [topSellers, setTopSellers] = useState<SteamApp[]>([]);

  // Check if user has skipped onboarding
  useEffect(() => {
    LocalStorage.getItem<string>("onboarding-skipped").then((val) => {
      setSkipped(val === "true");
    });
  }, []);

  // Prefetch owned games and friends in background on launch
  useEffect(() => {
    if (!steamApiKey || !steamId) return;
    fetchOwnedGames(steamApiKey, steamId);
    fetchWishlist(steamApiKey, steamId);
    if (!getCachedSubtitle("friends", FRIENDS_SUBTITLE_TTL)) {
      fetchFriendsOnline(steamApiKey, steamId).then((friends) => {
        if (isFriendsListPrivate()) return;
        const count = String(friends.length);
        setCachedSubtitle("friends", count);
        setFriendCount(friends.length);
      });
    }
    if (!getCachedSubtitle("recent", RECENT_SUBTITLE_TTL)) {
      fetchRecentlyPlayed(steamApiKey, steamId).then((games) => {
        const totalMinutes = games.reduce(
          (sum, g) => sum + (g.playtime_2weeks ?? 0),
          0,
        );
        const hours = totalMinutes / 60;
        const formatted = hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1);
        const subtitle = `${formatted} hours played in the past 2 weeks`;
        setCachedSubtitle("recent", subtitle);
        setRecentSubtitle(subtitle);
      });
    }
    if (!getCachedSubtitle("wishlist")) {
      fetchDiscountedWishlistGames(steamId, ggDealsApiKey, region)
        .then(({ games, unavailable }) => {
          if (unavailable !== null) return;
          const subtitle =
            games.length === 1
              ? "1 game discounted in your wishlist"
              : `${games.length} games discounted in your wishlist`;
          setCachedSubtitle("wishlist", subtitle);
          setWishlistSubtitle(subtitle);
        })
        .catch(() => {
          // Silently ignore — subtitle stays as default fallback
        });
    }
  }, [steamApiKey, steamId, ggDealsApiKey, region]);

  const { data, isLoading } = useFetch<SteamSearchResponse>(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&cc=${region}&l=english`,
    {
      execute: query.length > 1,
      onError: () => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: "Could not reach the Steam store API.",
        });
      },
    },
  );

  // Fetch top sellers for the home screen
  useEffect(() => {
    fetchTopSellers(region).then(setTopSellers);
  }, [region]);

  // Batch-fetch GG.deals prices for search results as soon as they arrive
  useEffect(() => {
    if (!data?.items?.length || !ggDealsApiKey) return;
    batchFetchGGDeals(
      data.items.map((a) => a.id),
      ggDealsApiKey,
      region,
    );
  }, [data, ggDealsApiKey, region]);

  // Batch-fetch GG.deals prices for top sellers
  useEffect(() => {
    if (!topSellers.length || !ggDealsApiKey) return;
    batchFetchGGDeals(
      topSellers.map((a) => a.id),
      ggDealsApiKey,
      region,
    );
  }, [topSellers, ggDealsApiKey, region]);

  // All hooks done — now safe to conditionally return
  if (skipped === null) return <List isLoading />;
  if (!steamApiKey && !steamId && !ggDealsApiKey && !skipped) {
    return <Onboarding onSkip={() => setSkipped(true)} />;
  }

  const results = data?.items ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search Steam…"
      throttle
    >
      {query.length <= 1 ? (
        <>
          <List.Section>
            {skipped && !steamApiKey && !steamId && (
              <List.Item
                icon={{ source: Icon.LightBulb, tintColor: Color.Yellow }}
                title="Get more out of Steam Search"
                subtitle="Add a Steam API key in Preferences to access even more useful data"
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Set up Keys"
                      icon={Icon.Key}
                      target={<Onboarding onSkip={() => {}} />}
                    />
                  </ActionPanel>
                }
              />
            )}
            {steamApiKey && steamId && (
              <List.Item
                icon={Icon.Clock}
                title="Recently Played"
                subtitle={recentSubtitle ?? "Your last 10 played games"}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Recently Played"
                      target={<RecentlyPlayed />}
                    />
                  </ActionPanel>
                }
              />
            )}
            {steamApiKey && steamId && (
              <List.Item
                icon={Icon.TwoPeople}
                title="Friends Online"
                subtitle={
                  friendCount !== null
                    ? `Currently ${friendCount} friends online`
                    : "See which friends are online and what they're playing"
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Friends Online"
                      target={<FriendsOnline />}
                    />
                  </ActionPanel>
                }
              />
            )}
            {steamApiKey && steamId && (
              <List.Item
                icon={Icon.Star}
                title="Wishlist Discounts"
                subtitle={
                  wishlistSubtitle ??
                  "View discounted games from your Steam wishlist"
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Wishlist Discounts"
                      target={<WishlistDiscounts />}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
          {topSellers.length > 0 && (
            <List.Section title="Top Sellers" subtitle={`${topSellers.length}`}>
              {topSellers.map((app) => (
                <GameItem
                  key={app.id}
                  app={app}
                  isSelected={selectedId === String(app.id)}
                />
              ))}
              <List.Item
                id="top-sellers-see-all"
                icon={Icon.ArrowRight}
                title="See all 100 top sellers"
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url="https://store.steampowered.com/charts/topselling/global"
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description={`No games matched "${query}"`}
        />
      ) : (
        <List.Section
          title={`Results for "${query}"`}
          subtitle={data ? `${data.total} found` : ""}
        >
          {results.map((app) => (
            <GameItem
              key={app.id}
              app={app}
              isSelected={selectedId === String(app.id)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
