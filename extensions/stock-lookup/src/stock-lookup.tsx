import { Action, ActionPanel, confirmAlert, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { SearchResult, searchStocks } from "./alphavantageApi";
import { ApiKeyForm } from "./ApiKeyForm";
import { changeApiKeyAlert } from "./changeApiKeyAlert";
import { StockResultListItem } from "./StockResultListItem";

export default function StockLookup() {
  const [isValidApiKey, setIsValidApiKey] = useState(true);
  const [stockSearchResults, setStockSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [recentStocks, setRecentStocks] = useState<SearchResult[]>([]);

  const testApiKey = async () => {
    setIsLoading(true);
    try {
      // search to test if the api key is valid or not
      await searchStocks({ keywords: "a" });
      setIsValidApiKey(true);
    } catch (error) {
      await LocalStorage.removeItem("apiKey");
      setIsValidApiKey(false);
      apiKeyErrorToast();
    }
    setIsLoading(false);
  };

  const apiKeyErrorToast = () => {
    showToast({ title: "Invalid API key or too many requests", style: Toast.Style.Failure });
  };

  const getApiKey = useCallback(async () => {
    const apiKey = await LocalStorage.getItem("apiKey");

    if (!apiKey) {
      setIsValidApiKey(false);
    }
  }, []);

  const getRecentlyViewedStocks = useCallback(async () => {
    const recentStocks = await LocalStorage.getItem<string>("recentStocks");
    const recentStocksArr = recentStocks ? JSON.parse(recentStocks) : [];
    setRecentStocks(recentStocksArr);
  }, []);

  useEffect(() => {
    getApiKey();
    getRecentlyViewedStocks();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isSearching === false) {
      getRecentlyViewedStocks();
    }
  }, [isSearching]);

  const onChangeApiKey = async () => {
    await LocalStorage.removeItem("apiKey");
    setIsValidApiKey(false);
  };

  const handleStockSearch = async (text: string) => {
    if (text.length > 0) {
      setIsLoading(true);
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

  if (!isValidApiKey) {
    return <ApiKeyForm testApiKey={testApiKey} />;
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action
            title="Change API Key"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure you want to change your API key?",
                primaryAction: {
                  title: "Yes",
                  onAction: async () => {
                    await LocalStorage.removeItem("apiKey");
                    setIsValidApiKey(false);
                  },
                },
              });
            }}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      searchBarPlaceholder="Search for a stock"
      onSearchTextChange={handleStockSearch}
      throttle={true}
    >
      <List.EmptyView
        title="No Stocks Found"
        icon={Icon.LevelMeter}
        actions={
          <ActionPanel>
            <Action
              title="Change API Key"
              onAction={async () => {
                changeApiKeyAlert(onChangeApiKey);
              }}
            />
          </ActionPanel>
        }
      />
      {isSearching ? (
        <List.Section key="results" title="Results">
          {stockSearchResults.map((result) => (
            <StockResultListItem key={result.symbol} stockResult={result} onChangeApiKey={onChangeApiKey} />
          ))}
        </List.Section>
      ) : (
        <List.Section key="recent" title="Recently Viewed Stocks">
          {recentStocks.map((stockResult) => (
            <StockResultListItem key={stockResult.symbol} stockResult={stockResult} onChangeApiKey={onChangeApiKey} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
