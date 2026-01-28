import { List } from "@raycast/api";
import React, { useState } from "react";
import fuzzysort from "fuzzysort";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import useCryptoList from "./utils/useCryptoList";
import useCoinWatchList from "./utils/useCoinWatchList";
import { CryptoCurrency } from "./types";
import CoinListItem from "./components/CoinListItem";
import useCoinPriceStore from "./utils/useCoinPriceStore";

dayjs.extend(relativeTime);

export default function SearchCryptoList() {
  const [isLoading, setIsLoading] = useState(false);

  const [searchResult, setSearchResult] = useState<CryptoCurrency[]>([]);

  const [selectedSlug, setSelectedSlug] = useState<string>("");

  const { store: coinPriceStore, refresh: refreshCoinPrice } = useCoinPriceStore(selectedSlug);

  const { watchList, addToWatchList, removeFromWatchList } = useCoinWatchList();
  const { cryptoList } = useCryptoList();

  const onSearchChange = (search: string) => {
    setIsLoading(true);
    const MAX_SEARCH_RESULT = 500;
    const fuzzyResult = fuzzysort.go(search, cryptoList, { keys: ["symbol", "name"] });
    const transformedFuzzyResult = fuzzyResult.slice(0, MAX_SEARCH_RESULT - 1).map((result) => result.obj);

    setSearchResult(transformedFuzzyResult);
    setIsLoading(false);
  };

  const onSelectChange = (id?: string | null) => {
    if (!id) return;

    const [slug] = id.split("_");

    setSelectedSlug(slug);
  };

  return (
    <List
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Enter the crypto name"
      onSearchTextChange={onSearchChange}
      onSelectionChange={onSelectChange}
    >
      {searchResult.length === 0 ? (
        <List.EmptyView title="No results found" />
      ) : (
        <List.Section title="Search results">
          {
            searchResult.map(({ name, symbol, slug }) => {
              const isWatchList = watchList.some(({ slug: watchListSlug }) => slug === watchListSlug);
              return (
                <CoinListItem
                  key={slug + "_" + name}
                  name={name}
                  slug={slug}
                  symbol={symbol}
                  coinPriceStore={coinPriceStore}
                  addToWatchList={addToWatchList}
                  removeFromWatchList={removeFromWatchList}
                  isWatchList={isWatchList}
                  refreshCoinPrice={refreshCoinPrice}
                />
              );
            }) as React.ReactNode
          }
        </List.Section>
      )}
    </List>
  );
}
