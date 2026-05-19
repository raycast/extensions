import { Color, Icon, List } from "@raycast/api";
import type { Quote, NewsItem } from "./yahoo-finance";
import { formatMoney, formatChange, formatEarningsDate } from "./utils";
import yahooFinance from "./yahoo-finance";

const MARKET_STATE_LABELS: Record<string, string> = {
  PRE: "Pre-Market",
  PREPRE: "Pre-Market",
  REGULAR: "Open",
  POST: "Post-Market",
  POSTPOST: "Post-Market",
  CLOSED: "Closed",
};

const MARKET_STATE_COLORS: Record<string, Color> = {
  PRE: Color.Yellow,
  PREPRE: Color.Yellow,
  REGULAR: Color.Green,
  POST: Color.Yellow,
  POSTPOST: Color.Yellow,
  CLOSED: Color.Red,
};

export function StockDetail({
  quote,
  chartMarkdown,
  isLoading,
  news,
}: {
  quote: Quote | undefined;
  chartMarkdown: string;
  isLoading: boolean;
  news?: NewsItem[];
}) {
  if (!quote) return <List.Item.Detail isLoading={isLoading} markdown="" />;

  const priceInfo = yahooFinance.currentPriceInfo(quote);
  const name = quote.displayName || quote.shortName || quote.symbol;

  const markdown = chartMarkdown || `**${quote.symbol} — ${name}**`;

  const earningsTs =
    quote.earningsTimestamp ??
    quote.earningsTimestampStart ??
    quote.earningsTimestampEnd;
  const isEstimated =
    !quote.earningsTimestamp && !!quote.earningsTimestampStart;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title={`${quote.symbol} — ${name}`}
            text={`${formatMoney(priceInfo.price, quote.currency)}  ${formatChange(priceInfo.change, priceInfo.changePercent, quote.currency)}`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Open"
            text={formatMoney(quote.regularMarketOpen, quote.currency)}
          />
          <List.Item.Detail.Metadata.Label
            title="Mkt Cap"
            text={formatMoney(quote.marketCap, quote.currency)}
          />
          <List.Item.Detail.Metadata.Label
            title="P/E"
            text={quote.trailingPE ? quote.trailingPE.toFixed(2) : "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="52w"
            text={`${formatMoney(quote.fiftyTwoWeekLow, quote.currency)} – ${formatMoney(quote.fiftyTwoWeekHigh, quote.currency)}`}
          />
          {earningsTs ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Earnings"
                text={`${formatEarningsDate(earningsTs)}${isEstimated ? " (est.)" : ""}`}
                icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
              />
            </>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Market">
            <List.Item.Detail.Metadata.TagList.Item
              text={quote.fullExchangeName || quote.exchange}
              color={Color.Blue}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={MARKET_STATE_LABELS[quote.marketState] ?? "Unknown"}
              color={
                MARKET_STATE_COLORS[quote.marketState] ?? Color.SecondaryText
              }
            />
          </List.Item.Detail.Metadata.TagList>
          {news && news.length > 0 ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              {news.slice(0, 3).map((item, i) => (
                <List.Item.Detail.Metadata.Link
                  key={i}
                  title={i === 0 ? "Latest News" : ""}
                  text={item.title}
                  target={item.link}
                />
              ))}
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
