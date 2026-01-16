import { List, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import {
  formatPercentage,
  getFirstOutcomePrice,
  trimQuestion,
  formatVolumeWithSuffix,
  getMarketUrl,
  parseOutcomeData,
} from "./utils";
import { Ticker, Market, Interval, PolyPriceHistory, PolyPricePoint, Tag } from "./types";
import { useFetch } from "@raycast/utils";
import { POLY_CLOB_URL } from "./constants";
import { renderGraphToSVG } from "./graph";

// TODO: Better organise various components
// TODO: Move various api calls into dedicated file
// TODO: Make AI API results available to AI commands. E.g. ask ai about market.

function JsonItem({ json }: { json: object }) {
  return (
    <Detail
      markdown={`\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``}
      navigationTitle="Raw Data"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Raw Data"
            content={JSON.stringify(json, null, 2)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function MarketStatusList({ market }: { market: Market }) {
  return (
    <Detail.Metadata.TagList title="Status">
      {market.active && <Detail.Metadata.TagList.Item text="Active" />}
      {market.closed && <Detail.Metadata.TagList.Item text="Closed" />}
      {market.featured && <Detail.Metadata.TagList.Item text="Featured" />}
      {market.new && <Detail.Metadata.TagList.Item text="New" />}
      {market.archived && <Detail.Metadata.TagList.Item text="Archived" />}
      {market.restricted && <Detail.Metadata.TagList.Item text="Restricted" />}
    </Detail.Metadata.TagList>
  );
}

function MarketOutcomeList({ market }: { market: Market }) {
  const parsedOutcomes = parseOutcomeData(market);
  return (
    <Detail.Metadata.TagList title="Outcomes">
      {parsedOutcomes.map((outcome) => (
        <Detail.Metadata.TagList.Item text={`${outcome.outcome} $${outcome.outcomePrice}`} key={outcome.outcome} />
      ))}
    </Detail.Metadata.TagList>
  );
}

function MarketTagList({ tags }: { tags: Tag[] }) {
  return (
    <Detail.Metadata.TagList title="Tags">
      {tags.map((tag) => (
        <Detail.Metadata.TagList.Item text={tag.label} key={tag.id} />
      ))}
    </Detail.Metadata.TagList>
  );
}

function MarketDetails({ market, ticker }: { market: Market; ticker: Ticker }) {
  const parsedOutcomes = parseOutcomeData(market);
  // TODO: Make the interval a choice in the search bar.
  const interval: Interval = "max";
  const fidelityInMin = {
    "1h": "1",
    "1d": "10",
    "1w": "60",
    "1m": "60",
    max: "60",
  }[interval];

  // TODO: Make this a choice in the Search Bar. E.g show only yes, no or both
  // Create fetch URLs for all outcomes
  const fetchUrls =
    market.active && parsedOutcomes.length > 0
      ? parsedOutcomes.map(
          (outcome) =>
            `${POLY_CLOB_URL}prices-history?interval=${interval}&market=${outcome.clobTokenId}&fidelity=${fidelityInMin}`,
        )
      : [];

  // Fetch data for all outcomes
  const fetchResults = fetchUrls.map((url, index) => {
    const { data, isLoading } = useFetch<PolyPriceHistory>(url);
    return {
      outcome: parsedOutcomes[index],
      data,
      isLoading,
    };
  });

  // Check if any data is still loading
  const isLoading = fetchResults.some((result) => result.isLoading);

  // Prepare all series data for the chart
  const seriesData = fetchResults.map((result) => ({
    name: result.outcome.outcome,
    data: result.data?.history?.map((p: PolyPricePoint) => ({ x: p.t, y: p.p })) || [],
  }));

  // Generate chart content
  let chartMarkdownContent: string;

  if (isLoading && fetchUrls.length > 0) {
    chartMarkdownContent = "## Loading price history data...";
  } else if (seriesData.some((series) => series.data.length > 0)) {
    const svgString = renderGraphToSVG(
      seriesData,
      [null, null], // Auto-calculated x domain
      [null, null], // Auto-calculated y domain
    );

    if (svgString.startsWith("Failed to render chart:") || svgString.startsWith("Error:")) {
      chartMarkdownContent = `${svgString}`;
    } else {
      const base64Svg = Buffer.from(svgString).toString("base64");
      chartMarkdownContent = `![Price History Chart](data:image/svg+xml;base64,${base64Svg})`;
    }
  } else {
    chartMarkdownContent =
      parsedOutcomes.length > 0 && market.active
        ? "## No price history data available"
        : "## Price history not applicable or market inactive";
  }

  return (
    <Detail
      isLoading={isLoading && fetchUrls.length > 0}
      navigationTitle={market.groupItemTitle || market.question}
      markdown={chartMarkdownContent}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Question" text={market.question} />
          <Detail.Metadata.Separator />
          <MarketOutcomeList market={market} />
          <MarketStatusList market={market} />
          <MarketTagList tags={ticker.tags || []} />
          <Detail.Metadata.Separator />
          {market.volume24hr && <Detail.Metadata.Label title="Volume 24hr" text={market.volume24hr.toFixed(2)} />}
          {market.spread && <Detail.Metadata.Label title="Spread" text={market.spread.toFixed(2)} />}
          {market.orderPriceMinTickSize && (
            <Detail.Metadata.Label title="Order Price Min Tick Size" text={market.orderPriceMinTickSize?.toFixed(2)} />
          )}
          {market.orderMinSize && (
            <Detail.Metadata.Label title="Order Min Size" text={market.orderMinSize.toFixed(2)} />
          )}
          <Detail.Metadata.Label title="Slug" text={market.slug} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Market" url={getMarketUrl(ticker.slug)} />
        </ActionPanel>
      }
    />
  );
}

function EventListItem({ ticker }: { ticker: Ticker }) {
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

function MarketListItem({ market, ticker }: { market: Market; ticker: Ticker }) {
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
