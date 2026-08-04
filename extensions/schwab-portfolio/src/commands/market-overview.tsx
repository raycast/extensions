import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { hasSchwabCredentials, schwabOAuth } from "../lib/oauth";
import { useMovers } from "../hooks/useMovers";
import { useQuotes } from "../hooks/useQuotes";
import { formatCurrency, formatNumber, formatPercent } from "../lib/formatters";
import type { MoverItem, Quote } from "../types/quotes";
import { Onboarding } from "../components/Onboarding";
import { SymbolDetail } from "../components/SymbolDetail";

const INDEXES = [
  { symbol: "$SPX", title: "S&P 500" },
  { symbol: "$DJI", title: "Dow Jones" },
  { symbol: "$COMPX", title: "Nasdaq Composite" },
] as const;

function percentAccessory(value: number | undefined): List.Item.Accessory | undefined {
  if (value == null) return undefined;
  return {
    tag: { value: formatPercent(value), color: value >= 0 ? Color.Green : Color.Red },
  };
}

/** Index quotes sometimes report netPercentChange as 0; derive it from netChange when possible. */
function indexPercentChange(quote: Quote | undefined): number | undefined {
  if (!quote) return undefined;
  if (quote.netPercentChange != null && quote.netPercentChange !== 0) return quote.netPercentChange;
  const previous =
    quote.closePrice ??
    (quote.lastPrice != null && quote.netChange != null ? quote.lastPrice - quote.netChange : undefined);
  if (quote.netChange != null && previous != null && previous !== 0) return (quote.netChange / previous) * 100;
  return quote.netPercentChange;
}

function MarketOverview() {
  const { data: quotes, isLoading: quotesLoading } = useQuotes(INDEXES.map((index) => index.symbol));
  const { data: movers, isLoading: moversLoading } = useMovers();

  const renderMover = (mover: MoverItem) => {
    const accessories: List.Item.Accessory[] = [{ text: formatCurrency(mover.lastPrice) }];
    const changeAccessory = percentAccessory(mover.netPercentChange);
    if (changeAccessory) accessories.push(changeAccessory);

    return (
      <List.Item
        key={mover.symbol}
        title={mover.symbol ?? "—"}
        subtitle={mover.description}
        accessories={accessories}
        actions={
          <ActionPanel>
            {mover.symbol && (
              <Action.Push title="View Details" icon={Icon.Eye} target={<SymbolDetail symbol={mover.symbol} />} />
            )}
            {mover.symbol && <Action.CopyToClipboard title="Copy Ticker" content={mover.symbol} />}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={quotesLoading || moversLoading}>
      <List.Section title="Indexes">
        {INDEXES.map(({ symbol, title }) => {
          const quote = quotes?.[symbol]?.quote;
          const accessories: List.Item.Accessory[] = [{ text: formatNumber(quote?.lastPrice) }];
          const changeAccessory = percentAccessory(indexPercentChange(quote));
          if (changeAccessory) accessories.push(changeAccessory);
          return (
            <List.Item
              key={symbol}
              title={title}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<SymbolDetail symbol={symbol} />} />
                  <Action.CopyToClipboard title="Copy Ticker" content={symbol} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {movers?.unavailable ? (
        <List.Item title="Movers unavailable for your Schwab API app" icon={Icon.ExclamationMark} />
      ) : (
        <>
          {(movers?.gainers.length ?? 0) > 0 && (
            <List.Section title="Top Gainers">{movers?.gainers.slice(0, 10).map(renderMover)}</List.Section>
          )}
          {(movers?.losers.length ?? 0) > 0 && (
            <List.Section title="Top Losers">{movers?.losers.slice(0, 10).map(renderMover)}</List.Section>
          )}
        </>
      )}
    </List>
  );
}

const Authed = withAccessToken(schwabOAuth)(MarketOverview);

export default function Command() {
  return hasSchwabCredentials() ? <Authed /> : <Onboarding />;
}
