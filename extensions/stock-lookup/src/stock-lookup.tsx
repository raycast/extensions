import { Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { SearchResult, searchStocks } from "./alphavantageApi";
import { StockResultListItem } from "./StockResultListItem";

export default function StockLookup() {
  const [stockSearchResults, setStockSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [recentStocks, setRecentStocks] = useState<SearchResult[]>([]);

  const apiKeyErrorToast = () => {
    showToast({ title: "Invalid API key or too many requests", style: Toast.Style.Failure });
  };

  const getRecentlyViewedStocks = useCallback(async () => {
    const recentStocks = await LocalStorage.getItem<string>("recentStocks");
    const recentStocksArr = recentStocks ? JSON.parse(recentStocks) : [];
    setRecentStocks(recentStocksArr);
  }, []);

  useEffect(() => {
    getRecentlyViewedStocks();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isSearching === false) {
      getRecentlyViewedStocks();
    }
  }, [isSearching]);

  const handleStockSearch = async (text: string) => {
    setIsLoading(true);
    if (text.length > 0) {
      setIsSearching(true);
      try {
        const results = await searchStocks({ keywords: text });
        setStockSearchResults(results);
      } catch (error) {
        apiKeyErrorToast();
      }
    } else {
      setIsSearching(false);
      setStockSearchResults([]);
    }
    setIsLoading(false);
  };

  function EmptyView() {
    const icon = isSearching ? Icon.LevelMeter : Icon.Binoculars;
    const title = isLoading ? "Searching..." : isSearching ? "No Stocks Found" : "Search for a stock";

    return <List.EmptyView title={title} icon={icon} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a stock"
      onSearchTextChange={handleStockSearch}
      throttle={true}
    >
      <EmptyView />
      {isSearching ? (
        <>
          <List.Section
            key="results"
            title={`${stockSearchResults.length} Stock${stockSearchResults.length > 1 ? "s" : ""} Found`}
          >
            {stockSearchResults.map((result, i) => (
              <StockResultListItem key={`${result.symbol}${i}`} stockResult={result} />
            ))}
          </List.Section>
        </>
      ) : (
        <>
          <List.Section
            key="recent"
            title={`Recently Viewed Stocks (${recentStocks.length} Result${recentStocks.length > 1 ? "s" : ""})`}
          >
            {recentStocks.map((stockResult, i) => (
              <StockResultListItem key={`${stockResult.symbol}${i}`} stockResult={stockResult} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
