import { Action, ActionPanel, Color, showToast, Toast, Icon, List, useNavigation } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import fuzzysort from "fuzzysort";
import fs from "fs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { getListFromFile, CRYPTO_LIST_PATH, refreshExistingCache } from "./utils";
import refreshCryptoList from "./utils/refreshCryptoList";
import useFavoriteCoins from "./utils/useFavoriteCoins";
import { CryptoCurrency } from "./types";
import CoinListItem from "./components/CoinListItem";
import useCoinPriceStore from "./utils/useCoinPriceStore";

dayjs.extend(relativeTime);

export default function SearchCryptoList() {
  const [isLoading, setIsLoading] = useState(false);
  const [cryptoList, setCryptoList] = useState<CryptoCurrency[]>([]);
  const [searchResult, setSearchResult] = useState<CryptoCurrency[]>([]);

  const [selectedSlug, setSelectedSlug] = useState<string>("");

  const { store: coinPriceStore, refresh: refreshCoinPrice } = useCoinPriceStore(selectedSlug);

  const { favoriteCoins, addFavoriteCoin, removeFavoriteCoin, loading: favoriteLoading } = useFavoriteCoins();

  const favoriteCoinSlugs = useMemo(() => favoriteCoins.map(({ slug }) => slug), [favoriteCoins]);
  const displayedSearchResult = useMemo<CryptoCurrency[]>(() => {
    return searchResult.filter(({ slug }) => !favoriteCoinSlugs.includes(slug));
  }, [favoriteCoins, searchResult]);

  useEffect(() => {
    getListFromFile((err, data) => {
      if (err) {
        console.error("ReadListError:" + err);
        return;
      }

      if (!data) {
        // fetch crypto list mapping if there's no data exist in the local file
        // the api has an limit num per request.
        refreshExistingCache((err, cryptoList) => {
          if (err) {
            console.error("WriteFileError:" + err);
            showToast(Toast.Style.Failure, "Refresh failed", (err as Error)?.message);
            return;
          }

          setCryptoList(cryptoList);
        });
      } else {
        const now = dayjs();
        const { cryptoList: cryptoListFromFile, timestamp } = JSON.parse(data);
        const fileCachedTimeDiff = now.diff(dayjs(timestamp), "day");

        //Remove cache file if it has been more than 15 days since last time saved.
        if (fileCachedTimeDiff >= 15) {
          fs.unlink(CRYPTO_LIST_PATH, (err) => {
            if (err) throw err;
            console.log("Crypto list cache has been cleared.");
          });
        }

        if (cryptoListFromFile) {
          setCryptoList(cryptoListFromFile);
        }
      }
    });
  }, []);

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
      {!favoriteLoading && favoriteCoins.length > 0 && (
        <List.Section title="Favorite Coins">
          {favoriteCoins.map(({ name, symbol, slug }) => (
            <CoinListItem
              key={`FAV_${name}`}
              name={name}
              slug={slug}
              symbol={symbol}
              coinPriceStore={coinPriceStore}
              addFavoriteCoin={addFavoriteCoin}
              removeFavoriteCoin={removeFavoriteCoin}
              isFavorite
              refreshCoinPrice={refreshCoinPrice}
            />
          ))}
        </List.Section>
      )}

      {displayedSearchResult.length === 0 ? null : (
        <List.Section title="Search results">
          {displayedSearchResult.map(({ name, symbol, slug }) => (
            <CoinListItem
              key={slug}
              name={name}
              slug={slug}
              symbol={symbol}
              coinPriceStore={coinPriceStore}
              addFavoriteCoin={addFavoriteCoin}
              removeFavoriteCoin={removeFavoriteCoin}
              isFavorite={false}
              refreshCoinPrice={refreshCoinPrice}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
