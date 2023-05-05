import { List, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { useSearchTickers } from "../apis";
import SearchItem from "./search-item";
import { useFavorites } from "../store";
import { Ticker } from "../schema";

export default function SearchList() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useSearchTickers(searchText);
  const { favorites, isLoading: isLoadingFavorite, favoritesStore } = useFavorites();
  const searching = !!searchText;
  const tickers = searching ? data?.data ?? [] : favorites;

  const isEmpty = searchText && !isLoading && tickers.length === 0;

  const addTickerToFavorite = (ticker: Ticker) => {
    favoritesStore.add(ticker);
  };

  const removeTickerFromFavorite = (ticker: Ticker) => {
    favoritesStore.remove(ticker.id, ticker.name);
  };

  return (
    <List
      isShowingDetail={!isEmpty}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
      isLoading={isLoading}
    >
      {isEmpty ? (
        <List.EmptyView icon={{ source: "empty.jpg" }} title="Type something to get started" />
      ) : (
        <List.Section title={searching ? "Search Results" : "Favorite list"}>
          {tickers.map((item) => (
            <SearchItem
              key={item.id}
              id={item.id}
              name={item.name}
              symbol={item.symbol}
              action={
                <Action
                  title={searching ? "Add to Favorites" : "Remove from Favorites"}
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => {
                    if (searching) {
                      addTickerToFavorite(item);
                    } else {
                      removeTickerFromFavorite(item);
                    }
                  }}
                />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
