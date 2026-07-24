import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { getFirstOutcomePrice, getMarketUrl } from "../helpers";
import { formatPercentage, trimQuestion, formatVolumeWithSuffix } from "../../../utils/formatters";
import { Ticker, Market } from "../types";
import { MarketDetails } from "./MarketDetails";
import { JsonItem } from "../../../components/ui/JsonItem";

/**
 * Individual row renderer for an overarching 'Event' (Ticker) fetched from the Search API.
 * Displays the Event's title, the number of nested markets inside it, and its total 24h trading volume.
 * Clicking this item pushes a sub-list (`MarketList`) rendering all individual markets contained inside.
 *
 * @param props.ticker - The `Ticker` object representing the Polymarket event.
 * @returns {JSX.Element} A Raycast `List.Item` populated with Event data and Actions.
 */
export function EventListItem({ ticker }: { ticker: Ticker }) {
  return (
    <List.Item
      key={ticker.slug}
      title={ticker.title}
      subtitle={`${ticker.markets.length} markets`}
      accessories={[{ text: `24h Vol: ${formatVolumeWithSuffix(ticker.volume24hr)}` }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Markets" target={<MarketList ticker={ticker} />} icon={Icon.AppWindowList} />
          <Action.CopyToClipboard
            title="Copy Market Summary"
            content={`${ticker.title}\n24h Volume: ${formatVolumeWithSuffix(ticker.volume24hr)}\nMarkets: ${ticker.markets.length}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Individual row renderer for a specific `Market` (condition) within an Event.
 * Displays the specific question, the leading outcome's implied probability (price percentage),
 * and the 24hr volume for this specific market.
 *
 * Clicking this item pushes the detailed `MarketDetails` graph view.
 *
 * @param props.market - The single `Market` data object.
 * @param props.ticker - The parent `Ticker` object containing the global contextual tags and links.
 * @returns {JSX.Element | null} A Raycast `List.Item`, or null if crucial rendering data is missing.
 */
export function MarketListItem({ market, ticker }: { market: Market; ticker: Ticker }) {
  if (!market.outcomePrices || (!market.groupItemTitle && !market.question)) {
    return null;
  }

  const firstPrice = getFirstOutcomePrice(market.outcomePrices);
  const volume = Number(market.volume24hr) || 0;

  return (
    <List.Item
      key={market.slug}
      title={market.groupItemTitle || trimQuestion(market.question)}
      accessories={[{ text: formatPercentage(firstPrice) }, { text: `24h Vol: ${formatVolumeWithSuffix(volume)}` }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Market" url={getMarketUrl(ticker.slug)} />
          <Action.Push
            icon={Icon.LineChart}
            title="View Market Details"
            target={<MarketDetails market={market} ticker={ticker} />}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.CopyToClipboard
            title="Copy Market Summary"
            content={`${market.groupItemTitle || market.question}\n${formatPercentage(firstPrice)}\n24h Volume: ${formatVolumeWithSuffix(volume)}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Push
            icon={Icon.Code}
            title="View Raw Data"
            target={<JsonItem json={market} />}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * A sub-list view rendered when a user expands an Event from the main search view.
 * Sorts all nested sub-markets by probability (highest likelihood first) and maps them to `MarketListItem`s.
 *
 * @param props.ticker - The `Ticker` containing the `.markets` array to loop through and render.
 * @returns {JSX.Element} A Raycast `List` view containing sorted specific markets.
 */
export function MarketList({ ticker }: { ticker: Ticker }) {
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
