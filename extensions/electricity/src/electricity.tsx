import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchPrices, PriceRow, getRegion } from "./api";
import {
  getPriceTier,
  formatPrice,
  calculateAverage,
  findCheapestHour,
  findBestWindow,
  generateRecommendation,
  isCurrentHour,
} from "./utils";

const DURATION_OPTIONS = [
  { value: "1", title: "1 hour" },
  { value: "2", title: "2 hours" },
  { value: "3", title: "3 hours" },
  { value: "4", title: "4 hours" },
  { value: "6", title: "6 hours" },
  { value: "8", title: "8 hours" },
];

export default function Command() {
  const [duration, setDuration] = useState("1");
  const {
    data: prices,
    isLoading,
    error,
  } = useCachedPromise(fetchPrices, [], {
    keepPreviousData: true,
  });

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.XMarkCircle} title="Failed to load prices" description={error.message} />
      </List>
    );
  }

  const avgPrice = prices ? calculateAverage(prices) : 0;
  const cheapest = prices ? findCheapestHour(prices) : null;
  const current = prices?.[0];
  const nextHour = prices?.[1];
  const durationNum = parseInt(duration, 10);
  const bestWindow = prices ? findBestWindow(prices, durationNum) : null;

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Consumption Duration" value={duration} onChange={setDuration}>
          <List.Dropdown.Section title="How long do you need power?">
            {DURATION_OPTIONS.map((opt) => (
              <List.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {/* Recommendation Section */}
      {current && cheapest && (
        <List.Section title="💡 Recommendation">
          <List.Item
            icon={{ source: Icon.LightBulb, tintColor: getPriceTier(current.retailCentsPerKwh).color }}
            title={generateRecommendation(current, nextHour || null, cheapest)}
            accessories={[{ text: `Avg: ${formatPrice(avgPrice)} s/kWh` }, { tag: getRegion() }]}
          />
        </List.Section>
      )}

      {/* Best Window for Duration */}
      {bestWindow && durationNum > 1 && (
        <List.Section title={`🎯 Best ${durationNum}h Window`}>
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={`${bestWindow.startTime} → ${bestWindow.endTime}`}
            subtitle={`Avg: ${formatPrice(bestWindow.averagePrice)} s/kWh`}
            accessories={[
              { tag: { value: `${durationNum}h`, color: Color.Blue } },
              { text: `Total: ${formatPrice(bestWindow.totalCost)} s/kWh` },
            ]}
          />
        </List.Section>
      )}

      {/* Cheapest Single Hour */}
      {cheapest && (
        <List.Section title="🏆 Best Hour">
          <List.Item
            icon={{ source: Icon.Star, tintColor: Color.Green }}
            title={`${cheapest.hour} → ${formatPrice(cheapest.retailCentsPerKwh)} s/kWh`}
            subtitle="Cheapest in next 24h"
          />
        </List.Section>
      )}

      {/* Price List */}
      <List.Section title="📊 Next 24 Hours">
        {prices?.map((row, index) => (
          <PriceItem
            key={index}
            row={row}
            isInWindow={
              bestWindow && durationNum > 1 ? index >= bestWindow.startIndex && index <= bestWindow.endIndex : false
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function PriceItem({ row, isInWindow }: { row: PriceRow; isInWindow: boolean }) {
  const { emoji, color, icon } = getPriceTier(row.retailCentsPerKwh);
  const isCurrent = isCurrentHour(row);
  const priceText = `${formatPrice(row.retailCentsPerKwh)} s/kWh`;

  return (
    <List.Item
      icon={{ source: icon, tintColor: color }}
      title={`${row.hour} ${emoji}`}
      subtitle={priceText}
      accessories={[
        isInWindow ? { tag: { value: "✓ BEST", color: Color.Green } } : {},
        isCurrent ? { tag: { value: "NOW", color: Color.Blue } } : {},
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open Elektrikell"
              url="https://elektrikell.ee"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.OpenInBrowser
              title="Open Nordpool"
              url={`https://data.nordpoolgroup.com/auction/day-ahead/prices?deliveryDate=latest&currency=EUR&aggregation=Hourly&deliveryAreas=${getRegion()}`}
              icon={Icon.Link}
            />
            <Action.OpenInBrowser
              title="Open Elering Dashboard"
              url="https://dashboard.elering.ee/et"
              icon={Icon.BarChart}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Price" content={priceText} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
