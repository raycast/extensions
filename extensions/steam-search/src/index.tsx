import {
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { SteamSearchResponse } from "./types";
import { fetchOwnedGames } from "./api/steam";
import { batchFetchGGDeals } from "./api/ggdeals";
import { GameItem } from "./components/GameItem";
import { Onboarding } from "./components/Onboarding";

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
  }, []);

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
  }, [data]);

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
        <List.EmptyView
          icon={{ source: "icon.png" }}
          title="Steam Search"
          description="Type at least 2 characters to search for games"
        />
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
