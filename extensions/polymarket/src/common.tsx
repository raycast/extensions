import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { formatPercentage, getFirstOutcomePrice, trimQuestion, formatVolumeWithSuffix, getMarketUrl } from "./utils";
import { Ticker, Market } from "./types";

function EventListItem({ ticker: Ticker }: { ticker: Ticker }) {
  return (
    <List.Item
      key={Ticker.title}
      title={Ticker.title}
      subtitle={`${Ticker.markets.length} markets`}
      accessories={[{ text: `24h Vol: ${formatVolumeWithSuffix(Ticker.volume24hr)}` }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Markets" target={<MarketList ticker={Ticker} />} icon={Icon.AppWindowList} />
          <Action.CopyToClipboard
            title="Copy Market Info"
            content={`${Ticker.title}\n24h Volume: ${formatVolumeWithSuffix(Ticker.volume24hr)}\nMarkets: ${Ticker.markets.length}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function MarketListItem({ market, ticker }: { market: Market; ticker: Ticker }) {
  if (!market.outcomePrices || (!market.groupItemTitle && !market.question)) {
    return null;
  }

  const firstPrice = getFirstOutcomePrice(market.outcomePrices);
  const volume = Number(market.volume24hr) || 0;

  return (
    <List.Item
      key={market.question}
      title={market.groupItemTitle || trimQuestion(market.question)}
      accessories={[{ text: formatPercentage(firstPrice) }, { text: `24h Vol: ${formatVolumeWithSuffix(volume)}` }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Market" url={getMarketUrl(ticker.slug)} />
          <Action.CopyToClipboard
            title="Copy Market Info"
            content={`${market.groupItemTitle || market.question}\n${formatPercentage(firstPrice)}\n24h Volume: ${formatVolumeWithSuffix(volume)}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function MarketList({ ticker }: { ticker: Ticker }) {
  const sortedMarkets = [...ticker.markets].sort((a, b) => {
    const aPrice = getFirstOutcomePrice(a.outcomePrices);
    const bPrice = getFirstOutcomePrice(b.outcomePrices);
    return bPrice - aPrice;
  });

  return (
    <List>
      {sortedMarkets.map((market) => {
        try {
          return <MarketListItem market={market} ticker={ticker} key={market.slug} />;
        } catch {
          return null;
        }
      })}
    </List>
  );
}

export { EventListItem, MarketList };
