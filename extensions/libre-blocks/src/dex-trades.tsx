import { useState, useEffect } from "react";
import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import fetch from "node-fetch";
import React from "react";

interface DexTrade {
  id: number;
  pair: string;
  seller: string;
  buyer: string;
  price: string;
  baseAsset: string;
  quoteAsset: string;
  timestamp: string;
  type: string;
  blockNumber: number;
}

interface DexTradesResponse {
  rows: DexTrade[];
  more: boolean;
  next_key: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [trades, setTrades] = useState<DexTrade[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchTrades();
  }, []);

  async function fetchTrades() {
    setIsLoading(true);
    try {
      const response = await fetch("https://lb.libre.org/v1/chain/get_table_rows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: "dex.libre",
          table: "history2",
          scope: "dex.libre",
          json: true,
          reverse: true,
          limit: 100,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DexTradesResponse = await response.json();

      if (data.rows && Array.isArray(data.rows)) {
        setTrades(data.rows);
      } else {
        setTrades([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Parsing Trades",
          message: "Could not parse DEX trades data",
        });
      }
    } catch (error) {
      console.error("Error fetching DEX trades:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Fetching Trades",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredTrades = trades.filter((trade) => {
    if (selectedPair !== "all" && trade.pair !== selectedPair) {
      return false;
    }

    if (selectedType !== "all" && !trade.type.toLowerCase().includes(selectedType.toLowerCase())) {
      return false;
    }

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      return (
        trade.seller.toLowerCase().includes(searchLower) ||
        trade.buyer.toLowerCase().includes(searchLower) ||
        trade.baseAsset.toLowerCase().includes(searchLower) ||
        trade.quoteAsset.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const uniquePairs = Array.from(new Set(trades.map((trade) => trade.pair)));

  function formatPrice(price: string): string {
    const numPrice = parseFloat(price);
    if (numPrice < 0.00001) {
      return numPrice.toFixed(12);
    } else if (numPrice < 0.001) {
      return numPrice.toFixed(8);
    } else {
      return numPrice.toFixed(6);
    }
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString();
  }

  function getTradeTypeIcon(type: string) {
    if (type.includes("buy")) {
      return { source: Icon.Circle, tintColor: Color.Green };
    } else if (type.includes("sell")) {
      return { source: Icon.Circle, tintColor: Color.Red };
    }
    return { source: Icon.Circle, tintColor: Color.PrimaryText };
  }

  function getTradeTypeColor(type: string) {
    if (type.includes("buy")) {
      return Color.Green;
    } else if (type.includes("sell")) {
      return Color.Red;
    }
    return Color.PrimaryText;
  }

  function renderTradeMetadata(trade: DexTrade) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Trade Information" />
        <List.Item.Detail.Metadata.Label title="Trade ID" text={`#${trade.id}`} icon={{ source: "hash" }} />
        <List.Item.Detail.Metadata.Label
          title="Date & Time"
          text={formatTimestamp(trade.timestamp)}
          icon={Icon.Calendar}
        />
        <List.Item.Detail.Metadata.Label title="Trading Pair" text={trade.pair.toUpperCase()} icon={Icon.Coins} />
        <List.Item.Detail.Metadata.Label title="Type" text={trade.type} icon={getTradeTypeIcon(trade.type)} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Price Details" />
        <List.Item.Detail.Metadata.Label title="Price" text={formatPrice(trade.price)} icon={{ source: "tag" }} />
        <List.Item.Detail.Metadata.Label
          title="Base Asset"
          text={trade.baseAsset}
          icon={{ source: Icon.Coins, tintColor: Color.Blue }}
        />
        <List.Item.Detail.Metadata.Label
          title="Quote Asset"
          text={trade.quoteAsset}
          icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Participants" />
        <List.Item.Detail.Metadata.Label
          title="Seller"
          text={trade.seller}
          icon={{ source: Icon.Person, tintColor: Color.Red }}
        />
        <List.Item.Detail.Metadata.Label
          title="Buyer"
          text={trade.buyer}
          icon={{ source: Icon.Person, tintColor: Color.Green }}
        />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by account or asset..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Trading Pair" value={selectedPair} onChange={setSelectedPair}>
          <List.Dropdown.Item title="All Pairs" value="all" />
          {uniquePairs.map((pair) => (
            <List.Dropdown.Item key={pair} title={pair.toUpperCase()} value={pair} />
          ))}
        </List.Dropdown>
      }
      filtering={false}
      throttle={true}
      isShowingDetail
      navigationTitle="Libre DEX Trades"
    >
      <List.Section title="Filter by Type">
        <List.Dropdown tooltip="Filter by Trade Type" value={selectedType} onChange={setSelectedType}>
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Item title="Buy" value="buy" />
          <List.Dropdown.Item title="Sell" value="sell" />
        </List.Dropdown>
      </List.Section>
      {filteredTrades.map((trade) => {
        const typeColor = getTradeTypeColor(trade.type);

        return (
          <List.Item
            key={trade.id}
            id={`trade-${trade.id}`}
            title={`${trade.seller} → ${trade.buyer}`}
            icon={{ source: `#${trade.id}`, tintColor: typeColor }}
            detail={<List.Item.Detail metadata={renderTradeMetadata(trade)} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="View on Libreblocks.io" url={`https://www.libreblocks.io/dex`} />
                <Action.CopyToClipboard title="Copy Seller's Account" content={trade.seller} />
                <Action.CopyToClipboard title="Copy Buyer's Account" content={trade.buyer} />
                <Action title="Refresh Trades" icon={Icon.RotateClockwise} onAction={fetchTrades} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
