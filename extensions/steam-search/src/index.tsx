import {
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { SteamSearchResponse } from "./types";
import { fetchOwnedGames, fetchWishlist } from "./api/steam";
import { batchFetchGGDeals } from "./api/ggdeals";
import { GameItem } from "./components/GameItem";
import { Onboarding } from "./components/Onboarding";
import { RecentlyPlayed } from "./components/RecentlyPlayed";
import { WishlistDiscounts } from "./components/WishlistDiscounts";
import { FriendsOnline } from "./components/FriendsOnline";

export default function Command() {
  const { steamApiKey, steamId, ggDealsApiKey, region } = getPreferenceValues();
  const [skipped, setSkipped] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Check if user has skipped onboarding
  useEffect(() => {
    LocalStorage.getItem<string>("onboarding-skipped").then((val) => {
      setSkipped(val === "true");
    });
  }, []);

  // Prefetch owned games in background on launch
  useEffect(() => {
    if (!steamApiKey || !steamId) return;
    fetchOwnedGames(steamApiKey, steamId);
    fetchWishlist(steamApiKey, steamId);
  }, [steamApiKey, steamId]);

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

  // Batch-fetch GG.deals prices for all results as soon as they arrive
  useEffect(() => {
    if (!data?.items?.length || !ggDealsApiKey) return;
    batchFetchGGDeals(
      data.items.map((a) => a.id),
      ggDealsApiKey,
      region,
    );
  }, [data, ggDealsApiKey, region]);

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
        <List.Section>
          {steamApiKey && steamId && (
            <List.Item
              icon={Icon.Clock}
              title="Recently Played"
              subtitle="Your last 10 played games"
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
              subtitle="See which friends are online and what they're playing"
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
              subtitle="View discounted games from your Steam wishlist"
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
