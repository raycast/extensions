import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchAllTickers } from "./api";
import { SortCriteria, Ticker24hr } from "./types";
import { extractBaseAsset, formatAmount } from "./utils";

// ============ Constants ============

const SORT_STORAGE_KEY = "market-prices-sort-criteria";

const SORT_OPTIONS: { id: SortCriteria; name: string }[] = [
  { id: "volume", name: "Volume" },
  { id: "gainers", name: "Gainers" },
  { id: "losers", name: "Losers" },
];

// ============ Helper Functions ============

function sortTickers(tickers: Ticker24hr[], criteria: SortCriteria): Ticker24hr[] {
  const sorted = [...tickers];

  switch (criteria) {
    case "volume":
      return sorted.sort((a, b) => (b.quoteVolumeUsd ?? 0) - (a.quoteVolumeUsd ?? 0));
    case "gainers":
      return sorted.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
    case "losers":
      return sorted.sort((a, b) => parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent));
    default:
      return sorted;
  }
}

function getChangeColor(changePercent: string): Color {
  const change = parseFloat(changePercent);
  if (change > 0) return Color.Green;
  if (change < 0) return Color.Red;
  return Color.SecondaryText;
}

function formatChangePercent(changePercent: string): string {
  return formatAmount(changePercent, { type: "percent", showSign: true });
}

function formatVolume(volume: number): string {
  return formatAmount(volume, { type: "volume" });
}

function formatTickerPrice(value: string, ticker: Ticker24hr): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";

  const precision = ticker.pricePrecision ?? 8;
  return formatAmount(num, { type: "price", precision });
}

// ============ Components ============

function TickerDetail({ ticker }: { ticker: Ticker24hr }) {
  const Metadata = List.Item.Detail.Metadata;

  const priceChange = parseFloat(ticker.priceChange);
  const precision = ticker.pricePrecision ?? 8;
  const baseAsset = extractBaseAsset(ticker.symbol);

  // Format price change with appropriate precision
  const formatPriceChange = (value: number): string => {
    const sign = value >= 0 ? "+" : "-";
    const absValue = Math.abs(value);
    return `${sign}${formatAmount(absValue, { type: "price", precision })}`;
  };

  return (
    <List.Item.Detail
      metadata={
        <Metadata>
          <Metadata.Label title="Symbol" text={{ value: ticker.symbol, color: Color.Yellow }} />
          <Metadata.Separator />

          <Metadata.Label
            title="Price"
            text={{ value: formatTickerPrice(ticker.lastPrice, ticker), color: Color.Yellow }}
          />
          <Metadata.Label
            title="24h Change"
            text={{
              value: `${formatPriceChange(priceChange)} (${formatChangePercent(ticker.priceChangePercent)})`,
              color: getChangeColor(ticker.priceChangePercent),
            }}
          />
          <Metadata.Separator />

          <Metadata.Label
            title="Open Price"
            text={{ value: formatTickerPrice(ticker.openPrice, ticker), color: Color.SecondaryText }}
          />
          <Metadata.Label
            title="High Price"
            text={{ value: formatTickerPrice(ticker.highPrice, ticker), color: Color.SecondaryText }}
          />
          <Metadata.Label
            title="Low Price"
            text={{ value: formatTickerPrice(ticker.lowPrice, ticker), color: Color.SecondaryText }}
          />
          <Metadata.Separator />

          <Metadata.Label
            title={`24h Volume (${baseAsset})`}
            text={{
              value: formatAmount(ticker.volume, { type: "number", useGrouping: true }),
              color: Color.SecondaryText,
            }}
          />
          <Metadata.Label
            title="24h Volume (USD)"
            text={{ value: formatVolume(ticker.quoteVolumeUsd ?? 0), color: Color.SecondaryText }}
          />
          <Metadata.Label
            title="Weighted Avg Price"
            text={{ value: formatTickerPrice(ticker.weightedAvgPrice, ticker), color: Color.SecondaryText }}
          />
          <Metadata.Separator />

          <Metadata.Label
            title="Number of Trades"
            text={{ value: ticker.count.toLocaleString(), color: Color.SecondaryText }}
          />
          <Metadata.Label
            title="Bid Price"
            text={{ value: formatTickerPrice(ticker.bidPrice, ticker), color: Color.SecondaryText }}
          />
          <Metadata.Label
            title="Ask Price"
            text={{ value: formatTickerPrice(ticker.askPrice, ticker), color: Color.SecondaryText }}
          />
        </Metadata>
      }
    />
  );
}

function SortSubmenu({
  currentSort,
  onSortChange,
}: {
  currentSort: SortCriteria;
  onSortChange: (criteria: SortCriteria) => void;
}) {
  return (
    // eslint-disable-next-line @raycast/prefer-title-case
    <ActionPanel.Submenu title="Sort By" icon={Icon.ArrowDown}>
      {SORT_OPTIONS.map((option) => (
        <Action
          key={option.id}
          title={option.name}
          icon={currentSort === option.id ? Icon.CheckCircle : Icon.Circle}
          onAction={() => onSortChange(option.id)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export default function Command() {
  const [showDetails, setShowDetails] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>("volume");

  // Load persisted sort criteria
  useEffect(() => {
    LocalStorage.getItem<string>(SORT_STORAGE_KEY).then((stored) => {
      if (stored && ["volume", "gainers", "losers"].includes(stored)) {
        setSortCriteria(stored as SortCriteria);
      }
    });
  }, []);

  // Persist sort criteria when changed
  const handleSortChange = (criteria: SortCriteria) => {
    setSortCriteria(criteria);
    LocalStorage.setItem(SORT_STORAGE_KEY, criteria);
  };

  const { data: tickers, isLoading } = useCachedPromise(fetchAllTickers, [], {
    keepPreviousData: true,
  });

  const sortedTickers = tickers ? sortTickers(tickers, sortCriteria) : [];

  return (
    <List isLoading={isLoading} isShowingDetail={showDetails} searchBarPlaceholder="Filter by symbol...">
      {!showDetails && sortedTickers.length > 0 && (
        <List.Item
          key="__header__"
          title=""
          accessories={[
            { text: { value: "Price", color: Color.SecondaryText } },
            { text: { value: "24h Change", color: Color.SecondaryText } },
            { text: { value: "Volume", color: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <SortSubmenu currentSort={sortCriteria} onSortChange={handleSortChange} />
            </ActionPanel>
          }
        />
      )}
      {sortedTickers.map((ticker) => {
        const changeColor = getChangeColor(ticker.priceChangePercent);
        const changeText = formatChangePercent(ticker.priceChangePercent);
        const volumeText = formatVolume(ticker.quoteVolumeUsd ?? 0);
        const priceText = formatTickerPrice(ticker.lastPrice, ticker);

        return (
          <List.Item
            key={ticker.symbol}
            title={ticker.symbol}
            accessories={
              showDetails
                ? undefined
                : [
                    { text: { value: priceText, color: Color.SecondaryText } },
                    { tag: { value: changeText, color: changeColor } },
                    { text: { value: volumeText, color: Color.SecondaryText } },
                  ]
            }
            detail={<TickerDetail ticker={ticker} />}
            actions={
              <ActionPanel>
                <Action
                  title={showDetails ? "Hide Details" : "Show Details"}
                  icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() => setShowDetails(!showDetails)}
                />
                <SortSubmenu currentSort={sortCriteria} onSortChange={handleSortChange} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
