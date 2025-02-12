import { Alert, Grid, Icon, List, confirmAlert, getPreferenceValues } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useState } from "react";
import { ListEmptyView } from "./components/ListEmptyView";
import { RecentSearchListItem } from "./components/RecentSearchListItem";
import { ResultGridItem } from "./components/ResultGridItem";
import { ResultListItem } from "./components/ResultListItem";
import { MAX_RECENT_SEARCHES } from "./constants";
import { MercadoLibreItem, MercadoLibreResponse, Preferences } from "./types";

export default function Command() {
  const { siteId, viewLayout, gridItemSize } = getPreferenceValues<Preferences>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentSearches, setRecentSearches] = useCachedState<string[]>("recentSearches", []);
  const url = `https://api.mercadolibre.com/sites/${siteId}/search?q=${searchQuery}`;

  const { isLoading, data, pagination } = useFetch<MercadoLibreResponse, unknown, MercadoLibreItem[]>(() => url, {
    mapResult(result) {
      return {
        data: result.results,
        hasMore: result.paging.offset < result.paging.total,
      };
    },
    execute: searchQuery.length > 0,
    keepPreviousData: true,
  });

  const handleSearchSelect = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchOpen = (query: string) => {
    const updatedSearches = [query, ...recentSearches.filter((item) => item !== query)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updatedSearches);
  };

  const handleRemoveSearchItem = (query: string) => {
    setRecentSearches(recentSearches.filter((item) => item !== query));
  };

  const handleClearSearchHistory = async () => {
    const isConfirmed = await confirmAlert({
      title: "Clear all recent searches?",
      icon: Icon.Trash,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (isConfirmed) {
      setRecentSearches([]);
    }
  };
  if (recentSearches.length === 0 && searchQuery === "") {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search Mercado Libre"
        searchText={searchQuery}
        onSearchTextChange={setSearchQuery}
        throttle
      >
        <ListEmptyView />
      </List>
    );
  } else if (recentSearches.length > 0 && searchQuery === "") {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search Mercado Libre"
        searchText={searchQuery}
        onSearchTextChange={setSearchQuery}
        throttle
      >
        <List.Section title="Recent Searches">
          {recentSearches.map((query, index) => (
            <RecentSearchListItem
              key={index}
              query={query}
              index={index}
              handleSearchSelect={handleSearchSelect}
              handleRemoveSearchItem={handleRemoveSearchItem}
              handleClearSearchHistory={handleClearSearchHistory}
            />
          ))}
        </List.Section>
      </List>
    );
  } else {
    return viewLayout === "grid" ? (
      <Grid
        isLoading={isLoading}
        columns={Number(gridItemSize)}
        searchBarPlaceholder="Search Mercado Libre"
        searchText={searchQuery}
        onSearchTextChange={setSearchQuery}
        throttle
        pagination={pagination}
      >
        <Grid.Section title="Results" subtitle={`${data?.length} ${data?.length === 1 ? "listing" : "listings"}`}>
          {data?.map((item, index) => (
            <ResultGridItem
              key={`${item.id}-${index}`}
              item={item}
              handleSearchOpen={() => handleSearchOpen(searchQuery)}
            />
          ))}
        </Grid.Section>
      </Grid>
    ) : (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search Mercado Libre"
        searchText={searchQuery}
        onSearchTextChange={setSearchQuery}
        throttle
        pagination={pagination}
      >
        <List.Section title="Results" subtitle={`${data?.length} ${data?.length === 1 ? "listing" : "listings"}`}>
          {data?.map((item, index) => (
            <ResultListItem
              key={`${item.id}-${index}`}
              item={item}
              handleSearchOpen={() => handleSearchOpen(searchQuery)}
            />
          ))}
        </List.Section>
      </List>
    );
  }
}
