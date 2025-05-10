import { useState, useEffect, useRef } from "react";
import { List, ActionPanel, Action, Icon, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useSearchCoins, SearchResult } from "./coinmarketcap";
import { getPreferences } from "./utils";
import CoinDetail from "./coin-detail";

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
    if (error && !(error instanceof Error && error.message === "canceled")) {
      showFailureToast(error, { title: "Error searching coins" });
    }
  }, [error, revalidate]);

  // Setup interval refresh (only if search text has length >= 2)
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (
      refreshInterval &&
      refreshInterval > 0 &&
      searchText.length >= 2 &&
      revalidate
    ) {
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
  }, [refreshInterval, revalidate, searchText]);

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
          {/* Removed direct API key check action here, relies on the error toast */}
          <Action.OpenInBrowser
            title="Get Coinmarketcap Api Key"
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
                title="Get Coinmarketcap Api Key"
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
                  title="Copy Coin Id"
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
                  title="View on Coinmarketcap"
                  icon={{ source: Icon.Link }}
                  url={`https://coinmarketcap.com/currencies/${coin.slug}`}
                />
                <Action.OpenInBrowser
                  title="Get Coinmarketcap Api Key"
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
