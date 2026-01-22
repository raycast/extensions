import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchPrices, PriceRow, getRegion, getVatRate } from "./api";
import { getPriceTier, formatPrice, calculateAverage, findCheapestHour, findMostExpensiveHour } from "./utils";

export default function Command() {
  const {
    data: prices,
    isLoading,
    error,
  } = useCachedPromise(fetchPrices, [], {
    keepPreviousData: true,
  });

  if (error) {
    return <Detail markdown={`# Error\n\n${error.message}`} />;
  }

  const avgPrice = prices ? calculateAverage(prices) : 0;
  const cheapest = prices ? findCheapestHour(prices) : null;
  const mostExpensive = prices ? findMostExpensiveHour(prices) : null;
  const maxPrice = mostExpensive?.retailCentsPerKwh || 1;

  const markdown = generateChartMarkdown(prices || [], avgPrice, maxPrice);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Region" text={getRegion()} />
          <Detail.Metadata.Label title="VAT" text={`${(getVatRate() * 100).toFixed(1)}% included`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Average" text={`${formatPrice(avgPrice)} s/kWh`} />
          {cheapest && (
            <Detail.Metadata.TagList title="Cheapest">
              <Detail.Metadata.TagList.Item
                text={`${cheapest.hour}: ${formatPrice(cheapest.retailCentsPerKwh)} s/kWh`}
                color="green"
              />
            </Detail.Metadata.TagList>
          )}
          {mostExpensive && (
            <Detail.Metadata.TagList title="Most Expensive">
              <Detail.Metadata.TagList.Item
                text={`${mostExpensive.hour}: ${formatPrice(mostExpensive.retailCentsPerKwh)} s/kWh`}
                color="red"
              />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Data Source"
            target={`https://data.nordpoolgroup.com/auction/day-ahead/prices?deliveryDate=latest&currency=EUR&aggregation=Hourly&deliveryAreas=${getRegion()}`}
            text="Nordpool Day-Ahead"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Nordpool"
            url={`https://data.nordpoolgroup.com/auction/day-ahead/prices?deliveryDate=latest&currency=EUR&aggregation=Hourly&deliveryAreas=${getRegion()}`}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.OpenInBrowser
            title="Open Elektrikell"
            url="https://elektrikell.ee"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          <Action.OpenInBrowser
            title="Open Elering Dashboard"
            url="https://dashboard.elering.ee/et"
            icon={Icon.BarChart}
          />
        </ActionPanel>
      }
    />
  );
}

function generateChartMarkdown(prices: PriceRow[], avgPrice: number, maxPrice: number): string {
  if (prices.length === 0) {
    return "# Loading prices...";
  }

  const now = new Date();
  const currentHour = now.getHours();

  let chart = "# ⚡ Electricity Price Chart\n\n";
  chart += "```\n";

  for (const row of prices) {
    const hour = row.moment.getHours();
    const hourStr = hour.toString().padStart(2, "0");
    const price = row.retailCentsPerKwh;
    const { emoji } = getPriceTier(price);

    // Create bar (max 30 chars width)
    const barLength = Math.round((price / maxPrice) * 30);
    const bar = "█".repeat(Math.max(1, barLength));

    // Highlight current hour
    const marker = hour === currentHour ? " ◀ NOW" : "";
    const priceStr = formatPrice(price).padStart(5);

    chart += `${hourStr}:00 ${emoji} ${bar} ${priceStr} s${marker}\n`;
  }

  chart += "```\n";

  return chart;
}
