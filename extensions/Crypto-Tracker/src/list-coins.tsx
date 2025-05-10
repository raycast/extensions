import { useState, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  LaunchType,
} from "@raycast/api";
import { useTopCoins, Coin } from "./coinmarketcap";
import {
  getPreferences,
  formatCurrency,
  formatPercentage,
  getColorForValue,
} from "./utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import CoinDetail from "./coin-detail";
import type { LaunchProps } from "@raycast/api";

dayjs.extend(relativeTime);

export default function ListCoins() {
  const { vsCurrency, refreshInterval } = getPreferences();
  const { data: coins, isLoading, error, revalidate } = useTopCoins(50);

  const [searchText, setSearchText] = useState("");
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>([]);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedCoinId, setSelectedCoinId] = useState<string>("");


  // Filter coins when data or search text changes
  useEffect(() => {
    if (coins) {
      if (searchText) {
        const filteredList = coins.filter(
          (coin) =>
            coin.name.toLowerCase().includes(searchText.toLowerCase()) ||
            coin.symbol.toLowerCase().includes(searchText.toLowerCase()),
        );
        setFilteredCoins(filteredList);
      } else {
        setFilteredCoins(coins);
      }
    }
  }, [coins, searchText]);

  // Handle errors with toast notifications
  useEffect(() => {
    if (error && !(error instanceof Error && error.message === "canceled")) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load cryptocurrencies",
        message: error instanceof Error ? error.message : String(error),
        primaryAction: {
          title: "Try Again",
          onAction: () => {
            revalidate();
          },
        },
      });
    }
  }, [error, revalidate]);

  // Setup interval refresh
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (refreshInterval && refreshInterval > 0 && revalidate) {
      const refreshMs = refreshInterval * 60 * 1000;
      refreshTimerRef.current = setInterval(() => {
        revalidate();
      }, refreshMs);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval, revalidate]);


  const getCoinPrice = (coin: Coin) => {
    const currencyUpper = vsCurrency.toUpperCase();
    return coin.quote && coin.quote[currencyUpper]
      ? coin.quote[currencyUpper].price
      : 0;
  };

  const getCoinPriceChange = (coin: Coin) => {
    const currencyUpper = vsCurrency.toUpperCase();
    return coin.quote && coin.quote[currencyUpper]
      ? coin.quote[currencyUpper].percent_change_24h
      : 0;
  };

  const getCoinLogo = (coin: Coin) => {
    return `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`;
  };

  if (showDetails && selectedCoinId) {
    return (
      <CoinDetail
        launchType={LaunchType.UserInitiated}
        arguments={{ coinId: selectedCoinId }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search coins by name or symbol..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
      actions={
        <ActionPanel>
          {/* Removed direct API key check action here, relies on the error toast */}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <Action.OpenInBrowser
            title="Get CoinMarketCap API Key"
            icon={{ source: Icon.Key }}
            url="https://coinmarketcap.com/api/"
          />
        </ActionPanel>
      }
    >
      {error && !filteredCoins.length ? (
        <List.EmptyView
          title="Could not load cryptocurrencies"
          description={`Error: ${error instanceof Error ? error.message : String(error)}`}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Get CoinMarketCap API Key"
                icon={{ source: Icon.Key }}
                url="https://coinmarketcap.com/api/"
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredCoins?.map((coin) => (
          <List.Item
            key={`${coin.id}-${coin.symbol}`}
            title={`${coin.name} (${coin.symbol.toUpperCase()})`}
            subtitle={formatCurrency(getCoinPrice(coin), vsCurrency)}
            accessories={[
              {
                text: formatPercentage(getCoinPriceChange(coin)),
                tooltip: "24h Price Change",
                icon: {
                  source:
                    getCoinPriceChange(coin) >= 0
                      ? Icon.ArrowUp
                      : Icon.ArrowDown,
                  tintColor: getColorForValue(getCoinPriceChange(coin)),
                },
              },
              {
                text: `#${coin.cmc_rank}`,
                tooltip: "Market Cap Rank",
              },
            ]}
            icon={{
              source: getCoinLogo(coin),
              fallback: "cryptocurrency-icon.png",
            }}
            actions={
              <ActionPanel>
                <Action
                  title="View Coin Details"
                  icon={Icon.Eye}
                  onAction={() => {
                    setSelectedCoinId(coin.id.toString());
                    setShowDetails(true);
                  }}
                />
                 <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
                <Action.OpenInBrowser
                  title="View on CoinMarketCap"
                  icon={{ source: Icon.Link }}
                  url={`https://coinmarketcap.com/currencies/${coin.slug}`}
                />
                <Action.OpenInBrowser
                  title="Get CoinMarketCap API Key"
                  icon={{ source: Icon.Key }}
                  url="https://coinmarketcap.com/api/"
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}