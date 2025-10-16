import { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "./api";
import { ShowResponse } from "moviedb-promise";
import { format } from "date-fns";
import TvShowDetail from "./components/TvShowDetail";
import Posters from "./components/Posters";
import Backdrops from "./components/Backdrops";
import Seasons from "./components/Seasons";
import Episodes from "./components/Episodes";
import { getSeasonStartEnd } from "./helpers";
import { RecentSearch, useRecentSearches } from "./hooks";

export default function Command() {
  const [query, setQuery] = useState("");

  const { data: trendingResults, isLoading: isLoadingTrendingResults } = useCachedPromise(async () => {
    const results = await moviedb.trending({ media_type: "tv", time_window: "day" });
    return results.results;
  });

  const { data: searchResults, isLoading: isLoadingSearchResults } = useCachedPromise(
    async (query) => {
      const results = await moviedb.searchTv({ query });
      return results.results;
    },
    [query],
    {
      execute: query.length > 0,
      keepPreviousData: true,
    },
  );

  const {
    recentSearches,
    recentSearchesWithInfo,
    isLoading: isLoadingRecentSearches,
    addRecentSearch,
    removeRecentSearch,
  } = useRecentSearches("recentTVShowSearches");

  const showTrendingSection =
    (!searchResults || searchResults.length === 0 || query.length === 0) && (recentSearches?.length ?? 0) <= 5;
  const showRecentSearches = !searchResults || searchResults.length === 0 || query.length === 0;

  return (
    <List
      isLoading={isLoadingTrendingResults || isLoadingSearchResults || isLoadingRecentSearches}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail
      searchBarPlaceholder="Search for a TV show"
    >
      {showRecentSearches ? (
        <List.Section title="Recent Searches">
          {recentSearchesWithInfo?.map((result) => {
            return (
              <Show
                key={result.id}
                show={result}
                isInRecentSearches
                addRecentSearch={addRecentSearch}
                removeRecentSearch={removeRecentSearch}
              />
            );
          })}
        </List.Section>
      ) : null}

      {showTrendingSection ? (
        <List.Section title="Trending">
          {trendingResults?.map((result) => <Show key={result.id} show={result} addRecentSearch={addRecentSearch} />)}
        </List.Section>
      ) : null}

      <List.Section title="Search Results">
        {searchResults?.map((result) => <Show key={result.id} show={result} addRecentSearch={addRecentSearch} />)}
      </List.Section>
    </List>
  );
}

type ShowProps = {
  show: ShowResponse;
  isInRecentSearches?: boolean;
  removeRecentSearch?: (search: RecentSearch) => Promise<void>;
  addRecentSearch?: (search: RecentSearch) => Promise<void>;
};

function Show(showProps: ShowProps) {
  const show = showProps.show;
  const title = show.name ?? show.original_name ?? "Unknown Show";
  const firstAirDate = show.first_air_date ? format(new Date(show.first_air_date ?? ""), "PP") : "Unknown";
  const lastAirDate = show.last_air_date ? format(new Date(show.last_air_date ?? ""), "PP") : "";

  const rating = show.vote_average ? show.vote_average.toFixed(1) : "Not Rated";
  const { push } = useNavigation();

  return (
    <List.Item
      icon={`https://image.tmdb.org/t/p/w200/${show.poster_path}`}
      title={show.name ?? "Unknown Show"}
      detail={
        <List.Item.Detail
          markdown={`![Movie Banner](https://image.tmdb.org/t/p/w500/${show.backdrop_path})${
            show.overview ? `\n\n${show.overview}` : ""
          }`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={title} />
              <List.Item.Detail.Metadata.Label title="Media Type" text="TV Show" />
              <List.Item.Detail.Metadata.Label title="First Air Date" text={firstAirDate} />
              {lastAirDate ? <List.Item.Detail.Metadata.Label title="Last Air Date" text={lastAirDate} /> : null}

              <List.Item.Detail.Metadata.Label
                title="Rating"
                text={`${rating}${show.vote_count ? ` (${show.vote_count} votes)` : ""}`}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Label title="TMDB ID" text={show.id ? show.id.toString() : "Unknown"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Seasons"
            icon={Icon.Image}
            target={show.id !== undefined && <Seasons id={show.id} />}
            onPush={async () => {
              if (show.id) {
                await showProps.addRecentSearch?.({ name: title, id: show.id });
              }
            }}
          />
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<TvShowDetail show={show} />} />
          <Action.OpenInBrowser url={`https://www.themoviedb.org/tv/${show.id ?? 0}`} />
          {show.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={show.id.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          ) : null}
          <Action.Push
            title="Show Posters"
            icon={Icon.Image}
            target={show.id !== undefined && <Posters id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            title="Show Backdrops"
            icon={Icon.Image}
            target={show.id !== undefined && <Backdrops id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
          <Action
            title="Show Current Season From Preferences"
            icon={Icon.Star}
            onAction={async () => {
              const { currShow, currShowSeason } = getPreferenceValues();
              if (currShow && currShowSeason) {
                const { seasonStart, seasonEnd } = await getSeasonStartEnd();
                push(
                  <Episodes
                    id={currShow}
                    seasonNumber={currShowSeason}
                    seasonStart={seasonStart}
                    seasonEnd={seasonEnd}
                  />,
                );
              } else {
                showToast(Toast.Style.Failure, "No show and/or season is set in preferences");
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {showProps.isInRecentSearches ? (
            <ActionPanel.Section>
              <Action
                title="Remove From Recent Searches"
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                onAction={async () => {
                  await showProps.removeRecentSearch?.({ name: title, id: show.id ?? 0 });
                }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel.Section>
          ) : null}
          <Action icon={Icon.Gear} title="Open Command Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
