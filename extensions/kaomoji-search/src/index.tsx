import { List, getPreferenceValues, Grid } from "@raycast/api";
import { useState, useMemo } from "react";
import { useSearch } from "./hooks/useSearch";
import { useRecentKaomoji } from "./hooks/useRecentKaomoji";
import { useFavoriteKaomoji } from "./hooks/useFavoriteKaomoji";
import { KaomojiListItem } from "./components/KaomojiListItem";
import { KaomojiGridItem } from "./components/KaomojiGridItem";
import { SearchResult } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const state = useSearch(searchText);
  const { displayMode, primaryAction } = getPreferenceValues<Preferences>();

  const displayGroupedResults = searchText.length === 0;
  const groupedResultsByCategory = useMemo(() => {
    const groupedResults: Record<string, SearchResult[]> = {};
    state.results.forEach((result) => {
      if (!groupedResults[result.category]) {
        groupedResults[result.category] = [];
      }
      groupedResults[result.category].push(result);
    });
    return groupedResults;
  }, [state.results]);

  const groupedResultsCategories = useMemo(() => {
    return Object.keys(groupedResultsByCategory).sort((a, b) => {
      if (a === "UNASSIGNED") {
        return 1;
      }

      if (b === "UNASSIGNED") {
        return -1;
      }

      return a.localeCompare(b);
    });
  }, [groupedResultsByCategory]);

  const { recentKaomojis } = useRecentKaomoji();
  const { favoriteKaomojis, toggleFavorite, isFavorite } = useFavoriteKaomoji();

  // Filter out pinned kaomojis from frequently used to avoid duplicates
  const favoriteIds = useMemo(() => new Set(favoriteKaomojis.map((k) => k.id)), [favoriteKaomojis]);
  const recentNonPinnedKaomojis = useMemo(
    () => recentKaomojis.filter((k) => !favoriteIds.has(k.id)),
    [recentKaomojis, favoriteIds],
  );

  const ListComponent = displayMode === "list" ? List : Grid;
  const ItemComponent = displayMode === "list" ? KaomojiListItem : KaomojiGridItem;

  return (
    <ListComponent
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name..."
      throttle
    >
      {displayGroupedResults ? (
        <>
          {favoriteKaomojis.length > 0 && (
            <ListComponent.Section title="Pinned Favorites" subtitle={favoriteKaomojis.length + ""}>
              {favoriteKaomojis.map((result) => (
                <ItemComponent
                  key={result.id}
                  searchResult={result}
                  primaryAction={primaryAction}
                  toggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              ))}
            </ListComponent.Section>
          )}

          {recentNonPinnedKaomojis.length > 0 && (
            <ListComponent.Section title="Frequently Used" subtitle={recentNonPinnedKaomojis.length + ""}>
              {recentNonPinnedKaomojis.map((result) => (
                <ItemComponent
                  key={result.id}
                  searchResult={result}
                  primaryAction={primaryAction}
                  toggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              ))}
            </ListComponent.Section>
          )}

          {groupedResultsCategories.map((category) => (
            <ListComponent.Section
              title={category}
              subtitle={groupedResultsByCategory[category].length + ""}
              key={category}
            >
              {groupedResultsByCategory[category].map((searchResult) => (
                <ItemComponent
                  key={searchResult.id}
                  searchResult={searchResult}
                  primaryAction={primaryAction}
                  toggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                />
              ))}
            </ListComponent.Section>
          ))}
        </>
      ) : (
        <ListComponent.Section title="Results" subtitle={state.results.length + ""}>
          {state.results.map((searchResult) => (
            <ItemComponent
              key={searchResult.id}
              searchResult={searchResult}
              primaryAction={primaryAction}
              toggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          ))}
        </ListComponent.Section>
      )}
    </ListComponent>
  );
}
