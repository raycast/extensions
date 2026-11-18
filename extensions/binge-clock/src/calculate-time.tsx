import { ActionPanel, Grid, Icon, List } from "@raycast/api";
import { useMemo, useRef, useState } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getSuggestions } from "./utils/api";
import { SearchResult } from "./interface/search-result";
import { SearchResultListItem } from "./components/SearchResultListItem";
import { SearchResultGridItem } from "./components/SearchResultGridItem";
import { ToggleLayoutAction } from "./components/Actions";

const MIN_SEARCH_LENGTH = 2;

type MediaFilter = "all" | "show" | "film";

export default function Command() {
  const [searchTerm, setSearchTerm] = useState("");
  const [mediaFilter, setMediaFilter] = useCachedState<MediaFilter>("mediaFilter", "all");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("isShowingDetail", true);
  const normalizedSearchTerm = searchTerm.trim();
  const abortable = useRef<AbortController | undefined>(undefined);

  const [layout, setLayout] = useCachedState("layout", "list");
  const toggleLayout = () => setLayout((current: string) => (current === "grid" ? "list" : "grid"));

  const { data: searchResults = [], isLoading } = useCachedPromise(
    async (query: string) => getSuggestions(query, abortable.current?.signal),
    [normalizedSearchTerm],
    {
      abortable,
      execute: normalizedSearchTerm.length >= MIN_SEARCH_LENGTH,
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not search Binge Clock",
        message: "Check your connection and try again",
      },
    },
  );

  const filteredResults = useMemo(() => {
    if (mediaFilter === "all") {
      return searchResults;
    }

    return searchResults.filter((result) => result.type === mediaFilter);
  }, [mediaFilter, searchResults]);

  let emptyTitle = "Search for a movie or TV show";
  let emptyDescription = `Type at least ${MIN_SEARCH_LENGTH} characters`;
  if (normalizedSearchTerm.length >= MIN_SEARCH_LENGTH && isLoading) {
    emptyTitle = "Loading...";
    emptyDescription = "Fetching results from Binge Clock";
  } else if (normalizedSearchTerm.length >= MIN_SEARCH_LENGTH && filteredResults.length === 0) {
    if (searchResults.length > 0) {
      emptyTitle = "No Matches for Filter";
      emptyDescription = "Try another filter or search term";
    } else {
      emptyTitle = "No Results";
      emptyDescription = "Try another title";
    }
  }

  if (layout === "grid") {
    return (
      <Grid
        isLoading={isLoading}
        aspectRatio="4/3"
        columns={3}
        fit={Grid.Fit.Fill}
        searchBarPlaceholder="Search for movie / TV show"
        throttle
        onSearchTextChange={setSearchTerm}
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Filter by Type"
            value={mediaFilter}
            onChange={(value) => setMediaFilter(value as MediaFilter)}
          >
            <Grid.Dropdown.Item icon={Icon.BulletPoints} title="All" value="all" />
            <Grid.Dropdown.Item icon={Icon.Play} title="TV Shows" value="show" />
            <Grid.Dropdown.Item icon={Icon.FilmStrip} title="Movies" value="film" />
          </Grid.Dropdown>
        }
      >
        <Grid.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
            </ActionPanel>
          }
        />
        <Grid.Section title="Results" subtitle={filteredResults.length + ""}>
          {filteredResults.map((result: SearchResult) => (
            <SearchResultGridItem key={result.id} result={result} layout={layout} onToggleLayout={toggleLayout} />
          ))}
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search for movie / TV show"
      throttle
      onSearchTextChange={setSearchTerm}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Type"
          value={mediaFilter}
          onChange={(value) => setMediaFilter(value as MediaFilter)}
        >
          <List.Dropdown.Item icon={Icon.BulletPoints} title="All" value="all" />
          <List.Dropdown.Item icon={Icon.Play} title="TV Shows" value="show" />
          <List.Dropdown.Item icon={Icon.FilmStrip} title="Movies" value="film" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            <ToggleLayoutAction layout={layout} onToggleLayout={toggleLayout} />
          </ActionPanel>
        }
      />
      <List.Section title="Results" subtitle={filteredResults.length + ""}>
        {filteredResults.map((result: SearchResult) => (
          <SearchResultListItem
            key={result.id}
            result={result}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
            layout={layout}
            onToggleLayout={toggleLayout}
          />
        ))}
      </List.Section>
    </List>
  );
}
