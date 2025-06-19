import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";
import React from "react";

interface HyperliquidPricesResponse {
  [key: string]: string;
}

interface PriceItem {
  symbol: string;
  price: string;
  formattedPrice: string;
  isHype: boolean;
  isBtc: boolean;
}

export default function CheckPrices() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error } = useFetch<HyperliquidPricesResponse>(
    "https://api.hyperliquid.xyz/info",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "allMids",
      }),
      onError: (error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch prices",
          message: error.message,
        });
      },
    },
  );

  const priceItems: PriceItem[] = useMemo(() => {
    if (!data) return [];

    return Object.entries(data)
      .map(([symbol, price]) => ({
        symbol,
        price,
        formattedPrice: formatPrice(price),
        isHype: symbol === "HYPE",
        isBtc: symbol === "BTC",
      }))
      .filter((item) => item.isBtc || item.isHype)
      .sort((a, b) => {
        if (a.isBtc && !b.isBtc) return -1;
        if (!a.isBtc && b.isBtc) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!searchText) {
      // Show HYPE and BTC by default when no search
      return priceItems.filter((item) => item.isHype || item.isBtc);
    }

    return priceItems.filter((item) =>
      item.symbol.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [priceItems, searchText]);

  function formatPrice(price: string): string {
    const num = parseFloat(price);
    if (num >= 1000) {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } else if (num >= 1) {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }).format(num);
    } else {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 6,
        maximumFractionDigits: 8,
      }).format(num);
    }
  }

  function getIcon(symbol: string): Icon {
    if (symbol.toLowerCase().includes("hype")) {
      return Icon.Rocket;
    } else if (symbol.toLowerCase().includes("btc") || symbol === "BTC") {
      return Icon.Coins;
    }
    return Icon.Circle;
  }

  function getIconColor(symbol: string): Color {
    if (symbol.toLowerCase().includes("hype")) {
      return Color.Orange;
    } else if (symbol.toLowerCase().includes("btc") || symbol === "BTC") {
      return Color.Yellow;
    }
    return Color.SecondaryText;
  }

  if (error) {
    return (
      <List>
        <List.Item
          title="Error fetching prices"
          subtitle={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for cryptocurrency prices..."
      throttle
    >
      <List.Section title={searchText ? "Search Results" : "Featured Prices"}>
        {filteredItems.map((item) => (
          <List.Item
            key={item.symbol}
            title={item.symbol}
            subtitle={`$${item.formattedPrice}`}
            icon={{
              source: getIcon(item.symbol),
              tintColor: getIconColor(item.symbol),
            }}
            accessories={[
              {
                text: item.isBtc ? "BTC-PERP" : item.isHype ? "HYPE-PERP" : "",
                tooltip: item.isBtc
                  ? "Bitcoin Perpetual"
                  : item.isHype
                    ? "Hyperliquid Perpetual"
                    : "",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Price"
                  content={item.price}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Formatted Price"
                  content={`$${item.formattedPrice}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="View on Hyperliquid"
                  url={`https://app.hyperliquid.xyz/trade/${item.symbol}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))}
        {!isLoading && filteredItems.length === 0 && (
          <List.Item
            title="No prices found"
            subtitle={
              searchText
                ? `No results for "${searchText}"`
                : "Unable to load price data"
            }
            icon={{
              source: Icon.MagnifyingGlass,
              tintColor: Color.SecondaryText,
            }}
          />
        )}
      </List.Section>

      {searchText && (
        <List.Section title="All Available Assets">
          {priceItems
            .filter((item) => !filteredItems.includes(item))
            .slice(0, 20) // Limit to prevent performance issues
            .map((item) => (
              <List.Item
                key={`all-${item.symbol}`}
                title={item.symbol}
                subtitle={`$${item.formattedPrice}`}
                icon={{
                  source: Icon.Circle,
                  tintColor: Color.SecondaryText,
                }}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Price"
                      content={item.price}
                    />
                    <Action.OpenInBrowser
                      title="View on Hyperliquid"
                      url={`https://app.hyperliquid.xyz/trade/${item.symbol}`}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}
