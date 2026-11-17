import { useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, environment, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { SearchResponse } from "@/types/search";
import type { League } from "@/storages/types";
import { useFavorite } from "@/hooks/useFavorite";
import { buildLeagueDetailUrl, buildLeagueLogoUrl } from "@/utils/url-builder";

async function searchLeagues(query: string): Promise<League[]> {
  const url = `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(query)}&lang=en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`League search failed: ${response.status} ${response.statusText}`);
  }
  const results = (await response.json()) as SearchResponse;
  return (
    results.leagueSuggest?.[0]?.options.map((option) => ({
      id: option.payload.id,
      name: option.text.split("|")[0],
      countryCode: option.payload.countryCode ?? "",
    })) ?? []
  );
}

export default function LeagueSearchView() {
  const [searchText, setSearchText] = useState("");
  const favoriteService = useFavorite();
  const query = searchText.trim();

  const { data, error, isLoading, revalidate } = useCachedPromise(searchLeagues, [query], {
    execute: query.length > 0,
    keepPreviousData: true,
    failureToastOptions: { title: "League search failed" },
  });

  const leagues = query.length > 0 ? (data ?? []) : [];

  return (
    <List
      navigationTitle="Search Leagues"
      searchBarPlaceholder="Search for a league or competition..."
      onSearchTextChange={setSearchText}
      isLoading={query.length > 0 && isLoading}
      throttle
    >
      {error && leagues.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="League search failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query.length > 0 ? "No leagues found" : "Search for a league"}
          description={query.length > 0 ? undefined : "Type a name, e.g. Premier League, LaLiga, World Cup"}
        />
      )}
      {leagues.map((league) => {
        const isFavorite = favoriteService.leagues.some((l) => l.id === league.id);
        return (
          <List.Item
            key={league.id}
            icon={buildLeagueLogoUrl(league.id, environment.appearance)}
            title={league.name}
            subtitle={league.countryCode}
            accessories={isFavorite ? [{ icon: Icon.Star, tooltip: "In favorites" }] : []}
            actions={
              <ActionPanel>
                {isFavorite ? (
                  <Action
                    icon={Icon.StarDisabled}
                    title="Remove from Favorites"
                    onAction={async () => {
                      await favoriteService.removeItems("league", league.id);
                      showToast({ style: Toast.Style.Success, title: "Removed from favorites", message: league.name });
                    }}
                  />
                ) : (
                  <Action
                    icon={Icon.Star}
                    title="Add to Favorites"
                    onAction={async () => {
                      await favoriteService.addItems({ type: "league", value: league });
                      showToast({ style: Toast.Style.Success, title: "Added to favorites", message: league.name });
                    }}
                  />
                )}
                <Action.OpenInBrowser icon={Icon.Globe} title="View on Fotmob" url={buildLeagueDetailUrl(league.id)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
