import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";
import { useState, useEffect } from "react";
import fuzzysort from "fuzzysort";
import fs from "fs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { getListFromFile, CRYPTO_LIST_PATH, refreshExistingCache } from "./utils";
import useFavoriteCoins from "./utils/useFavoriteCoins";
import { CryptoList, SearchResult } from "./types";
import useCoinPriceStore from "./utils/useCoinPriceStore";

dayjs.extend(relativeTime);

const BASE_URL = "https://coinmarketcap.com/currencies/";

export default function SearchCryptoList() {
  const [isLoading, setIsLoading] = useState(false);
  const [cryptoList, setCryptoList] = useState<CryptoList[]>([]);
  const [searchResult, setSearchResult] = useState<SearchResult[]>([]);

  const [selectedSlug, setSelectedSlug] = useState<string>("");

  const coinPriceStore = useCoinPriceStore(selectedSlug);

  const { favoriteCoins, addFavoriteCoin, removeFavoriteCoin, loading: favoriteLoading } = useFavoriteCoins();

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

    const fuzzyResult = fuzzysort.go(search, cryptoList, { keys: ["symbol", "name"] });
    const transformedFuzzyResult = fuzzyResult.map((result) => ({ obj: result.obj }));

    setSearchResult(transformedFuzzyResult);

    setIsLoading(false);
  };

  const onSelectChange = (id?: string) => {
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
      {searchResult.length === 0 ? null : (
        <List.Section title="Search result">
          {searchResult.map((result, index: number) => {
            const { name, slug, symbol } = result.obj;
            const coinPrice = coinPriceStore[slug];

            return (
              <List.Item
                id={`${slug}_${symbol}_${index}`}
                key={`${name}_${index}`}
                title={name}
                subtitle={coinPrice?.currencyPrice}
                icon={Icon.Star}
                accessoryTitle={coinPrice?.priceDiff}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction url={`${BASE_URL}${slug}`} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
