import { useState, useEffect } from "react";
import { List } from "@raycast/api";
import useCoinWatchList from "./utils/useCoinWatchList";
import CoinListItem from "./components/CoinListItem";
import useCoinPriceStore from "./utils/useCoinPriceStore";
import { CryptoCurrency } from "./types";
import { useFrecencySorting } from "@raycast/utils";

export default function WatchList() {
  const [selectedSlug, setSelectedSlug] = useState<string>("");

  const { store: coinPriceStore, refresh: refreshCoinPrice, batchFetchPrice } = useCoinPriceStore(selectedSlug);
  const { watchList, addToWatchList, removeFromWatchList, loading: watchListLoading } = useCoinWatchList();

  const { data: sortedWatchList, visitItem } = useFrecencySorting<CryptoCurrency>(watchList, {
    key: (item) => {
      return item.slug;
    },
  });

  useEffect(() => {
    batchFetchPrice(sortedWatchList.map(({ slug }) => slug));
  }, [sortedWatchList]);

  const onSelectChange = (id?: string | null) => {
    if (!id) return;

    const [slug, symbol, name] = id.split("_");

    setSelectedSlug(slug);
    visitItem({ slug, symbol, name });
  };
  return (
    <List
      isLoading={watchListLoading}
      throttle
      searchBarPlaceholder="Enter the crypto name"
      onSelectionChange={onSelectChange}
    >
      {!watchListLoading && sortedWatchList.length > 0 && (
        <List.Section title="Coins in Watchlist">
          {sortedWatchList.map(({ name, symbol, slug }) => (
            <CoinListItem
              key={`WATCH_${name}`}
              name={name}
              slug={slug}
              symbol={symbol}
              coinPriceStore={coinPriceStore}
              addToWatchList={addToWatchList}
              removeFromWatchList={removeFromWatchList}
              isWatchList
              refreshCoinPrice={refreshCoinPrice}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
