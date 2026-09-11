import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import type { Position } from "../types/accounts";
import type { QuoteData } from "../types/quotes";
import { usePriceHistory } from "../hooks/usePriceHistory";
import { useQuotes } from "../hooks/useQuotes";
import { useWatchlist } from "../hooks/useWatchlist";
import { PriceHistoryList } from "./PriceHistoryList";
import { buildChartMarkdown } from "../lib/chart-builder";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatVolume,
  formatChartLabel,
  formatLargeCurrency,
} from "../lib/formatters";
import { SCHWAB_POSITIONS_URL, TIMEFRAMES } from "../lib/constants";

interface SymbolDetailProps {
  symbol: string;
  quote?: QuoteData;
  position?: Position;
}

export function SymbolDetail({ symbol, quote: passedQuote, position }: SymbolDetailProps) {
  const prefs = getPreferenceValues<Preferences>();
  const [timeframe, setTimeframe] = useCachedState<string>("chart-timeframe", prefs.defaultTimeframe || "1M");
  const isOption = position?.instrument.assetType === "OPTION";
  const { addSymbol } = useWatchlist();

  const { data: quotes } = useQuotes([symbol]);
  const quote = quotes?.[symbol] ?? passedQuote;
  const { data: priceHistory, isLoading } = usePriceHistory(isOption ? "" : symbol, timeframe);

  const currentPrice = quote?.quote?.lastPrice ?? quote?.quote?.mark;
  const dailyChange = quote?.quote?.netChange;
  const dailyChangePct = quote?.quote?.netPercentChange;
  const description = quote?.reference?.description ?? position?.instrument.description ?? symbol;

  let chartMarkdown = "";
  if (isOption) {
    chartMarkdown = "*Price chart not available for options*";
  } else if (priceHistory && priceHistory.candles.length > 0) {
    const prices = priceHistory.candles.map((candle) => candle.close);
    const labels = priceHistory.candles.map((candle) => formatChartLabel(candle.datetime, timeframe));
    chartMarkdown = buildChartMarkdown({ prices, labels }, `${symbol} Price Chart`);
  } else if (isLoading) {
    chartMarkdown = "*Loading chart...*";
  } else {
    chartMarkdown = "*No chart data available*";
  }

  const changeSign = dailyChange != null && dailyChange >= 0 ? "+" : "";
  const priceHeader =
    currentPrice != null
      ? `## ${formatCurrency(currentPrice)} ${changeSign}${formatCurrency(dailyChange ?? 0)} (${formatPercent(dailyChangePct ?? 0)})`
      : "";
  const markdown = `# ${symbol} — ${description}\n\n${priceHeader}\n\n${chartMarkdown}`;

  const quantity = position ? position.longQuantity || position.shortQuantity || 0 : 0;
  const averageCost = position
    ? (position.averagePrice ?? position.averageLongPrice ?? position.taxLotAverageLongPrice)
    : undefined;
  const costBasis = averageCost != null ? averageCost * quantity : undefined;
  const unrealizedPL =
    position?.longOpenProfitLoss ??
    (position?.marketValue != null && costBasis != null ? position.marketValue - costBasis : undefined);
  const unrealizedPLPct =
    unrealizedPL != null && costBasis != null && costBasis !== 0 ? (unrealizedPL / costBasis) * 100 : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {position && (
            <>
              <Detail.Metadata.Label
                title="Quantity"
                text={isOption ? `${quantity} contracts` : formatNumber(quantity)}
              />
              {averageCost != null && <Detail.Metadata.Label title="Average Cost" text={formatCurrency(averageCost)} />}
              {position.marketValue != null && (
                <Detail.Metadata.Label title="Market Value" text={formatCurrency(position.marketValue)} />
              )}
              {costBasis != null && <Detail.Metadata.Label title="Cost Basis" text={formatCurrency(costBasis)} />}
              {unrealizedPL != null && (
                <Detail.Metadata.TagList title="Unrealized P/L">
                  <Detail.Metadata.TagList.Item
                    text={`${formatCurrency(unrealizedPL)} (${formatPercent(unrealizedPLPct ?? 0)})`}
                    color={unrealizedPL >= 0 ? Color.Green : Color.Red}
                  />
                </Detail.Metadata.TagList>
              )}
              <Detail.Metadata.Separator />
            </>
          )}

          {currentPrice != null && <Detail.Metadata.Label title="Current Price" text={formatCurrency(currentPrice)} />}
          {dailyChangePct != null && (
            <Detail.Metadata.TagList title="Daily Change">
              <Detail.Metadata.TagList.Item
                text={`${formatPercent(dailyChangePct)} (${formatCurrency(dailyChange ?? 0)})`}
                color={dailyChangePct >= 0 ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          {quote?.quote?.openPrice ? (
            <Detail.Metadata.Label title="Open" text={formatCurrency(quote.quote.openPrice)} />
          ) : null}
          {quote?.quote?.highPrice ? (
            <Detail.Metadata.Label title="Day High" text={formatCurrency(quote.quote.highPrice)} />
          ) : null}
          {quote?.quote?.lowPrice ? (
            <Detail.Metadata.Label title="Day Low" text={formatCurrency(quote.quote.lowPrice)} />
          ) : null}
          {quote?.quote?.["52WeekHigh"] != null && (
            <Detail.Metadata.Label title="52-Week High" text={formatCurrency(quote.quote["52WeekHigh"])} />
          )}
          {quote?.quote?.["52WeekLow"] != null && (
            <Detail.Metadata.Label title="52-Week Low" text={formatCurrency(quote.quote["52WeekLow"])} />
          )}
          {quote?.quote?.totalVolume ? (
            <Detail.Metadata.Label title="Volume" text={formatVolume(quote.quote.totalVolume)} />
          ) : null}

          <Detail.Metadata.Separator />

          {quote?.fundamental?.peRatio != null && (
            <Detail.Metadata.Label title="P/E Ratio" text={formatNumber(quote.fundamental.peRatio)} />
          )}
          {quote?.fundamental?.eps != null && (
            <Detail.Metadata.Label title="EPS" text={formatCurrency(quote.fundamental.eps)} />
          )}
          {quote?.fundamental?.divYield != null && (
            <Detail.Metadata.Label title="Dividend Yield" text={formatPercent(quote.fundamental.divYield)} />
          )}
          {quote?.fundamental?.marketCap != null && (
            <Detail.Metadata.Label title="Market Cap" text={formatLargeCurrency(quote.fundamental.marketCap)} />
          )}
          {quote?.fundamental?.beta != null && (
            <Detail.Metadata.Label title="Beta" text={formatNumber(quote.fundamental.beta)} />
          )}
          {quote?.reference?.exchange != null && (
            <Detail.Metadata.Label title="Exchange" text={quote.reference.exchange} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Submenu title="Chart Timeframe" icon={Icon.Clock}>
            {TIMEFRAMES.map((option) => (
              <Action
                key={option.value}
                title={option.label}
                onAction={() => setTimeframe(option.value)}
                icon={option.value === timeframe ? Icon.Checkmark : undefined}
              />
            ))}
          </ActionPanel.Submenu>
          {!isOption && (
            <Action.Push
              title="Browse Price Data"
              icon={Icon.List}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "d" },
                Windows: { modifiers: ["ctrl"], key: "d" },
              }}
              target={<PriceHistoryList symbol={symbol} timeframeValue={timeframe} />}
            />
          )}
          <Action
            title="Add to Watchlist"
            icon={Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={async () => {
              await addSymbol(symbol);
              await showToast({ style: Toast.Style.Success, title: `${symbol} added to Watchlist` });
            }}
          />
          <Action.CopyToClipboard title="Copy Ticker" content={symbol} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.OpenInBrowser
            title={position ? "Open in Schwab" : "Search on Schwab"}
            url={position ? SCHWAB_POSITIONS_URL : `https://www.schwab.com/research/stocks/${symbol}`}
          />
        </ActionPanel>
      }
    />
  );
}
