import { List, ActionPanel } from "@raycast/api";
import { useEffect } from "react";
import { useFavorites } from "./favorites-store";
import StockListItem from "./stock-list-item";
import { FavoritesAddRemoveAction } from "./favorites-list";
import { useStockSearch } from "./use-stock-search";

export default function SearchList({
  handleLoading,
  searchText,
}: {
  handleLoading: (isLoading: boolean) => void;
  searchText: string;
}) {
  const { searchResults, isLoading } = useStockSearch(searchText);
  const { favorites, favoritesStore } = useFavorites();

  useEffect(() => {
    handleLoading(isLoading);
  }, [isLoading]);

  return (
    <List.Section title="Search Results">
      {searchResults.map((quote, i) => (
        <StockListItem
          key={quote.symbol + i.toString()}
          quote={quote}
          actions={
            <ActionPanel.Section>
              <FavoritesAddRemoveAction favorites={favorites} favoritesStore={favoritesStore} symbol={quote.symbol!} />
            </ActionPanel.Section>
          }
        />
      ))}
    </List.Section>
  );
}
