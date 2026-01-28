import { List } from "@raycast/api";
import { changeIcon, formatMoney } from "./utils";
import yahooFinance, { Quote } from "./yahoo-finance";

export function StockDetail({ quote }: { quote: Quote | undefined }) {
  if (!quote || !quote.symbol) {
    return <List.Item.Detail isLoading />;
  }

  const priceInfo = yahooFinance.currentPriceInfo(quote);
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={quote.shortName} />
          <List.Item.Detail.Metadata.Label title="Ticker Symbol" text={quote.symbol} />
          <List.Item.Detail.Metadata.Label title="Type" text={quote.typeDisp} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Exchange" text={quote.fullExchangeName} />
          <List.Item.Detail.Metadata.Label title="Market State" text={marketStates[quote.marketState ?? "UNKNOWN"]} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Price" text={formatMoney(priceInfo.price, quote.currency)} />
          <List.Item.Detail.Metadata.Label
            title="Previous Close"
            text={formatMoney(quote.regularMarketPreviousClose, quote.currency)}
          />
          <List.Item.Detail.Metadata.Label title="Open" text={formatMoney(quote.regularMarketOpen, quote.currency)} />
          <List.Item.Detail.Metadata.Label
            icon={changeIcon(priceInfo.change)}
            title="Change"
            text={`${formatMoney(priceInfo.change, quote.currency)}${
              priceInfo.changePercent ? ` (${priceInfo.changePercent.toFixed(2)}%)` : ""
            }`}
          />
          <List.Item.Detail.Metadata.Label title="Market Cap" text={formatMoney(quote.marketCap, quote.currency)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

const marketStates = {
  PRE: "Pre-market",
  REGULAR: "Open",
  POST: "Post-market",
  CLOSED: "Closed",
  UNKNOWN: "Unknown",
};
