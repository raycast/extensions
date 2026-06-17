import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useFavorites } from "./favorites-store";
import { useStockInfo } from "./use-stock-info";
import { useStockSearch } from "./use-stock-search";
import { Quote } from "./yahoo-finance";
import SearchList from "./search-list";
import FavoritesList from "./favorites-list";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const isSearching = searchText.length > 0;

  const { favorites: favoriteSymbols, favoritesStore, isLoading: favoritesLoading } = useFavorites();

  const {
    searchResults,
    isLoading: searchLoading,
    lastUpdated: searchLastUpdated,
  } = useStockSearch(isSearching ? searchText : "");

  // Always fetch favorite quotes, even while searching, so toggling between modes doesn't reset them.
  const {
    quotes: favoriteQuotesMap,
    isLoading: favoritesQuotesLoading,
    lastUpdated: favoritesLastUpdated,
  } = useStockInfo(favoriteSymbols);

  const favoriteQuotes = useMemo(
    () => favoriteSymbols.map((s) => favoriteQuotesMap[s]).filter((q): q is Quote => !!q),
    [favoriteSymbols, favoriteQuotesMap],
  );

  const isLoading = isSearching ? searchLoading : favoritesLoading || favoritesQuotesLoading;
  const lastUpdated = isSearching ? searchLastUpdated : favoritesLastUpdated;

  return (
    <List
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle={true}
      isShowingDetail
      isLoading={isLoading}
    >
      {isSearching ? (
        <SearchList
          searchResults={searchResults}
          favoriteSymbols={favoriteSymbols}
          favoritesStore={favoritesStore}
          lastUpdated={lastUpdated}
        />
      ) : (
        <FavoritesList
          favorites={favoriteQuotes}
          favoriteSymbols={favoriteSymbols}
          favoritesStore={favoritesStore}
          lastUpdated={lastUpdated}
        />
      )}
    </List>
  );
}
