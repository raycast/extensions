import { List, LocalStorage } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { FavoritesList } from "./favorites-list";
import { useFavorites, useFavoritesQuotes } from "./favorites-store";
import { SearchList } from "./search-list";
import { useFinancialDetails } from "./use-financial-details";
import { useStockSearch } from "./use-stock-search";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const {
    favorites,
    isLoading: favoritesLoading,
    addFavorite,
    removeFavorite,
    moveUp,
    moveDown,
    isFavorite,
  } = useFavorites();
  const { quotes: favQuotes, isLoading: favQuotesLoading } = useFavoritesQuotes(favorites);
  const { results: searchResults, quotes: searchQuotes, isLoading: searchLoading } = useStockSearch(searchText);

  const isSearching = searchText.trim().length > 0;

  // Collect symbols that need financial details
  const financialSymbols = useMemo(() => {
    if (isSearching) {
      return Array.from(searchQuotes.keys());
    }
    return favorites.map((f) => f.symbol);
  }, [isSearching, searchQuotes, favorites]);

  const { details: financials } = useFinancialDetails(financialSymbols);

  const isLoading = favoritesLoading || favQuotesLoading || searchLoading;

  useEffect(() => {
    async function loadDetailViewPreference() {
      const storedValue = await LocalStorage.getItem<string>("is-showing-detail-view");
      if (storedValue == null) {
        return;
      }

      setIsShowingDetail(storedValue === "true");
    }

    loadDetailViewPreference();
  }, []);

  async function handleToggleDetailView() {
    const nextValue = !isShowingDetail;
    setIsShowingDetail(nextValue);
    await LocalStorage.setItem("is-showing-detail-view", String(nextValue));
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search stocks..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {isSearching ? (
        <SearchList
          results={searchResults}
          quotes={searchQuotes}
          financials={financials}
          isShowingDetail={isShowingDetail}
          onToggleDetailView={handleToggleDetailView}
          isFavorite={isFavorite}
          onAddFavorite={addFavorite}
          onRemoveFavorite={removeFavorite}
        />
      ) : (
        <FavoritesList
          favorites={favorites}
          quotes={favQuotes}
          financials={financials}
          isShowingDetail={isShowingDetail}
          onToggleDetailView={handleToggleDetailView}
          isFavorite={isFavorite}
          onRemoveFavorite={removeFavorite}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      )}
    </List>
  );
}
