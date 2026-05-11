import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import {
  chartMarkdown,
  fetchMarketBundle,
  formatCents,
  formatNumber,
  getMarketImageUrl,
  getApiUrl,
  getMarketUrl,
  priceCardsMarkdown,
  tradeTimelineMarkdown,
} from "../lib/kalshi";
import type {
  KalshiCandlestick,
  KalshiMarket,
  KalshiTrade,
} from "../types/kalshi";

type Props = {
  market: KalshiMarket;
  onToggleMarket: (market: KalshiMarket) => Promise<void>;
  onToggleTopic: (topic: string) => Promise<void>;
};

export function MarketDetail({ market, onToggleMarket, onToggleTopic }: Props) {
  const { data, isLoading, revalidate } = usePromise(fetchMarketBundle, [
    market,
  ]);
  const detailedMarket = data?.market ?? market;
  const rawData = JSON.stringify(data ?? { market }, null, 2);

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(
        detailedMarket,
        data?.candlesticks ?? [],
        data?.trades.trades ?? [],
      )}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Kalshi"
            url={getMarketUrl(detailedMarket)}
          />
          <Action.CopyToClipboard
            title="Copy Ticker"
            content={detailedMarket.ticker}
          />
          <Action.CopyToClipboard
            title="Copy Raw API Data"
            content={rawData}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Market API URL"
            content={getApiUrl(`/markets/${detailedMarket.ticker}`)}
          />
          <Action
            title="Toggle Favorite Market"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={async () => {
              await onToggleMarket(detailedMarket);
              await showToast({
                style: Toast.Style.Success,
                title: "Updated favorite market",
              });
            }}
          />
          {detailedMarket.event_ticker ? (
            <Action
              title="Toggle Favorite Event"
              icon={Icon.Tag}
              onAction={async () => {
                await onToggleTopic(detailedMarket.event_ticker ?? "");
                await showToast({
                  style: Toast.Style.Success,
                  title: "Updated favorite event",
                });
              }}
            />
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(
  market: KalshiMarket,
  candlesticks: KalshiCandlestick[],
  trades: KalshiTrade[],
): string {
  const imageUrl = getMarketImageUrl(market);
  const lines = [
    imageUrl ? `![${market.title}](${imageUrl})` : "",
    imageUrl ? "" : "",
    `# [${escapeMarkdown(market.title)}](${getMarketUrl(market)})`,
    market.subtitle ? `_${market.subtitle}_` : "",
    marketSummary(market),
    "",
    chartMarkdown(candlesticks),
    "",
    "## Prices",
    `Yes: **${formatCents(market.yes_bid ?? market.yes_bid_dollars)} / ${formatCents(market.yes_ask ?? market.yes_ask_dollars)}**`,
    `No: **${formatCents(market.no_bid ?? market.no_bid_dollars)} / ${formatCents(market.no_ask ?? market.no_ask_dollars)}**`,
    market.last_price || market.last_price_dollars
      ? `Last price: **${formatCents(market.last_price ?? market.last_price_dollars)}**`
      : "",
    "",
    "## Price Changes",
    "",
    priceCardsMarkdown(candlesticks),
    "",
    "## Recent Trades",
    "",
    tradeTimelineMarkdown(trades),
    "",
    market.rules_primary ? "## Rules" : "",
    market.rules_primary ?? "",
    market.rules_secondary ?? "",
  ];

  return lines.filter((line) => line !== "").join("\n\n");
}

function escapeMarkdown(value: string): string {
  return value.replace(/[[\]]/g, "\\$&");
}

function marketSummary(market: KalshiMarket): string {
  return [
    `Ticker: \`${market.ticker}\``,
    market.event_ticker ? `Event: \`${market.event_ticker}\`` : "",
    market.status ? `Status: ${market.status}` : "",
    `24h Vol: ${formatNumber(market.volume_24h ?? market.volume_24h_fp)}`,
    `OI: ${formatNumber(market.open_interest ?? market.open_interest_fp)}`,
    `Liquidity: ${formatNumber(market.liquidity ?? market.liquidity_dollars)}`,
    market.close_time
      ? `Close: ${new Date(market.close_time).toLocaleString()}`
      : "",
  ]
    .filter(Boolean)
    .join("  |  ");
}
