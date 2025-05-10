import { useState, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useSearchCoins, SearchResult } from "./coinmarketcap";
import { getPreferences } from "./utils";
import CoinDetail from "./coin-detail";
import type { LaunchProps } from "@raycast/api";

export default function SearchCoin() {
  const [searchText, setSearchText] = useState("");
  const {
    data: searchResults,
    isLoading,
    error,
    revalidate,
  } = useSearchCoins(searchText);
  const { refreshInterval } = getPreferences();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCoinId, setSelectedCoinId] = useState<string>("");

  // Handle errors with toast
  useEffect(() => {
    if (error) {
      showFailureToast(error, { 
        title: "Error searching coins",
        primaryAction: {
          title: "Try Again",
          onAction: revalidate,
        },
      });
    }
  }, [error]);

  // Setup auto-refresh based on refreshInterval preference
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Only set up refresh timer if the interval is valid, not too frequent, and we have a search term
    if (refreshInterval && refreshInterval > 0 && searchText.length >= 2) {
      // Convert minutes to milliseconds
      const refreshMs = refreshInterval * 60 * 1000;
      refreshTimerRef.current = setInterval(() => {
        revalidate();
      }, refreshMs);
    }

    // Cleanup the timer on component unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval, revalidate, searchText]);

  // Function to get logo URL for a coin
  const getCoinLogo = (coin: SearchResult) => {
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
      searchBarPlaceholder="Search for a cryptocurrency..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Get CoinMarketCap API Key"
            icon={{ source: Icon.Key }}
            url="https://coinmarketcap.com/api/"
          />
        </ActionPanel>
      }
    >
      {searchText.length < 2 ? (
        <List.EmptyView
          title="Enter at least 2 characters to search"
          icon={{ source: Icon.MagnifyingGlass }}
        />
      ) : error ? (
        <List.EmptyView
          title="Could not search cryptocurrencies"
          description={`Error: ${error instanceof Error ? error.message : String(error)}`}
          icon={{ source: Icon.Warning, tintColor: "red" }}
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
      ) : searchResults && searchResults.length === 0 ? (
        <List.EmptyView
          title="No cryptocurrencies found"
          description="Try a different search term"
          icon={{ source: Icon.QuestionMark }}
        />
      ) : (
        searchResults?.map((coin) => (
          <List.Item
            key={`${coin.id}-${coin.symbol}`}
            title={`${coin.name} (${coin.symbol.toUpperCase()})`}
            subtitle={coin.rank ? `Rank #${coin.rank}` : "Unranked"}
            icon={{
              source: coin.logo || getCoinLogo(coin),
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
                <Action.CopyToClipboard
                  title="Copy Coin ID"
                  content={coin.id.toString()}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
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
