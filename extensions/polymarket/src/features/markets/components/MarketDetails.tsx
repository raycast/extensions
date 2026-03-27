import { Detail, ActionPanel, Action } from "@raycast/api";
import { parseOutcomeData, getMarketUrl } from "../helpers";
import { Ticker, Market, Interval, PolyPriceHistory, PolyPricePoint, Tag } from "../types";
import { useFetch } from "@raycast/utils";
import { POLY_CLOB_URL } from "../../../utils/constants";
import { renderGraphToSVG } from "../../../components/graph/Graph";

/**
 * Renders the active metadata statuses for a given Market details view.
 * Displays conditionally loaded tags such as "Active", "Closed", "Featured", etc.
 *
 * @param props.market - The Polymarket `Market` object containing boolean state flags.
 * @returns {JSX.Element} A Raycast `Detail.Metadata.TagList` showing applicable statuses.
 */
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

/**
 * Renders the possible voting outcomes and their current trading prices.
 * Parses the raw outcome tokens (e.g., "Yes", "No") and pairs them with their JSON stringified values.
 *
 * @param props.market - The Polymarket `Market` object whose outcomes need parsing.
 * @returns {JSX.Element} A Raycast `Detail.Metadata.TagList` tracking the outcome values.
 */
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

/**
 * Renders the list of categorical tags (e.g., "Politics", "Crypto") associated with the parent Event.
 * Useful for filtering and giving contextual hints below the Market description.
 *
 * @param props.tags - An array of `Tag` objects extracted from the parent `Ticker`.
 * @returns {JSX.Element} A Raycast `Detail.Metadata.TagList` rendering each Tag's label.
 */
function MarketTagList({ tags }: { tags: Tag[] }) {
  return (
    <Detail.Metadata.TagList title="Tags">
      {tags.map((tag) => (
        <Detail.Metadata.TagList.Item text={tag.label} key={tag.id} />
      ))}
    </Detail.Metadata.TagList>
  );
}

/**
 * Main "Details Page" for a specific condition/market within an Event.
 * Orchestrates the data-fetching for the 2D Line Chart (SVG historic prices) and renders a detailed
 * breakdown of the market statistics including Volume, Spread, Order sizes, and URL shortcuts.
 *
 * This is the UI presented when a user presses `Cmd + D` (or "View Market Details") on a specific market row.
 *
 * @param props.market - The exact `Market` condition user selected.
 * @param props.ticker - The overarching `Ticker` (Event) that hosts this market, providing broader tags.
 * @returns {JSX.Element} A complex Raycast `Detail` component mapping price vectors and metadata.
 */
export function MarketDetails({ market, ticker }: { market: Market; ticker: Ticker }) {
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
