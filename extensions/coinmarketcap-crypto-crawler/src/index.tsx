import {
  ActionPanel,
  ActionPanelItem,
  Color,
  CopyToClipboardAction,
  Icon,
  List,
  OpenInBrowserAction,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import fuzzysort from "fuzzysort";
import fs from "fs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { getListFromFile, CRYPTO_LIST_PATH, refreshExistingCache } from "./utils";
import useFavoriteCoins from "./utils/useFavoriteCoins";
import { CryptoCurrency, PriceData } from "./types";
import useCoinPriceStore from "./utils/useCoinPriceStore";

dayjs.extend(relativeTime);

const BASE_URL = "https://coinmarketcap.com/currencies/";

type CoinListItemProps = {
  name: string;
  slug: string;
  symbol: string;
  coinPriceStore: { [key: string]: PriceData };
  addFavoriteCoin: (coin: CryptoCurrency) => void;
  removeFavoriteCoin: (coin: CryptoCurrency) => void;
  refreshCoinPrice: () => void;
  isFavorite: boolean;
};

function CoinListItem({
  name,
  slug,
  symbol,
  coinPriceStore,
  addFavoriteCoin,
  refreshCoinPrice,
  isFavorite,
  removeFavoriteCoin,
}: CoinListItemProps) {
  const coinPrice = coinPriceStore[slug];
  const { push } = useNavigation();

  let accessoryTitle;
  if (coinPrice) {
    const symbol = coinPrice.isUp ? "+" : "-";
    accessoryTitle = `${coinPrice.currencyPrice}, ${symbol}${coinPrice.priceDiff}`;
  }

  const price = useMemo(() => {
    if (coinPrice?.currencyPrice) {
      return parseFloat(coinPrice.currencyPrice.replace(/[$,]/g, ""));
    }
  }, [coinPrice]);

  return (
    <List.Item
      id={`${slug}_${symbol}`}
      title={name}
      icon={{
        source: Icon.Star,
        tintColor: isFavorite ? Color.Yellow : Color.PrimaryText,
      }}
      subtitle={`$${symbol.toUpperCase()}`}
      accessoryTitle={accessoryTitle}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`${BASE_URL}${slug}`} />

          {!!price && (
            <ActionPanelItem
              title="Convert Currency"
              icon={Icon.QuestionMark}
              onAction={() => {
                push(<CurrencyConverter coinPrice={price} symbol={symbol} name={name} />);
              }}
            />
          )}

          <ActionPanelItem
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => {
              if (isFavorite) {
                removeFavoriteCoin({ name, slug, symbol });
              } else {
                addFavoriteCoin({ name, slug, symbol });
              }
            }}
          />
          <ActionPanelItem title="Refresh Price" onAction={() => refreshCoinPrice()} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    />
  );
}

type CurrencyConverterProps = {
  coinPrice: number;
  name: string;
  symbol: string;
};

function CurrencyConverter({ coinPrice, name, symbol }: CurrencyConverterProps) {
  const [inputText, setInputText] = useState("");
  const inputNumber = useMemo(() => {
    if (inputText !== "") {
      return parseFloat(inputText.replace(/[$,]/g, ""));
    } else {
      return 1;
    }
  }, [inputText]);

  const usdPrice = useMemo(() => {
    if (inputNumber) {
      return inputNumber * coinPrice;
    }
  }, [inputNumber, coinPrice]);

  const currencyPrice = useMemo(() => {
    if (inputNumber && inputNumber > 0) {
      return inputNumber / coinPrice;
    }
  }, [inputNumber, coinPrice]);

  return (
    <List onSearchTextChange={(text) => setInputText(text)}>
      <List.Section title={`Convert ${name} with USD`}>
        {usdPrice && (
          <List.Item
            title={`${inputNumber} ${symbol.toUpperCase()}`}
            accessoryTitle={`${usdPrice} USD`}
            actions={
              <ActionPanel>
                <CopyToClipboardAction content={usdPrice.toString()} />
              </ActionPanel>
            }
          />
        )}

        {currencyPrice && (
          <List.Item
            title={`${inputNumber} USD`}
            accessoryTitle={`${currencyPrice} ${symbol.toUpperCase()}`}
            actions={
              <ActionPanel>
                <CopyToClipboardAction content={currencyPrice.toString()} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}

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
    const transformedFuzzyResult = fuzzyResult.map((result) => result.obj);

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
