import { MenuBarExtra, Icon, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchPrices, getRegion } from "./api";
import { getPriceTier, formatPrice, calculateAverage, findCheapestHour } from "./utils";

export default function Command() {
  const { data: prices, isLoading } = useCachedPromise(fetchPrices, [], {
    keepPreviousData: true,
  });

  const current = prices?.[0];
  const nextHour = prices?.[1];
  const avgPrice = prices ? calculateAverage(prices) : 0;
  const cheapest = prices ? findCheapestHour(prices) : null;

  // Menu bar title: current price with emoji
  let menuTitle = "⚡ --";
  if (current) {
    const { emoji } = getPriceTier(current.retailCentsPerKwh);
    menuTitle = `${emoji} ${formatPrice(current.retailCentsPerKwh)} s`;
  }

  return (
    <MenuBarExtra icon={Icon.Bolt} title={menuTitle} isLoading={isLoading} tooltip="Electricity Price">
      {current && (
        <MenuBarExtra.Section title="Current Price">
          <MenuBarExtra.Item
            icon={getPriceTier(current.retailCentsPerKwh).icon}
            title={`${current.hour} → ${formatPrice(current.retailCentsPerKwh)} s/kWh`}
            subtitle={getPriceTier(current.retailCentsPerKwh).label}
          />
        </MenuBarExtra.Section>
      )}

      {nextHour && (
        <MenuBarExtra.Section title="Next Hour">
          <MenuBarExtra.Item
            icon={getPriceTier(nextHour.retailCentsPerKwh).icon}
            title={`${nextHour.hour} → ${formatPrice(nextHour.retailCentsPerKwh)} s/kWh`}
            subtitle={nextHour.retailCentsPerKwh < (current?.retailCentsPerKwh || 0) ? "↘️ Dropping" : "↗️ Rising"}
          />
        </MenuBarExtra.Section>
      )}

      {cheapest && (
        <MenuBarExtra.Section title="Best Hour Today">
          <MenuBarExtra.Item
            icon={Icon.Star}
            title={`${cheapest.hour} → ${formatPrice(cheapest.retailCentsPerKwh)} s/kWh`}
            subtitle="Cheapest"
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.BarChart} title={`Average: ${formatPrice(avgPrice)} s/kWh`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Open in Browser">
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Elektrikell"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://elektrikell.ee")}
        />
        <MenuBarExtra.Item
          icon={Icon.Link}
          title="Open Nordpool"
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={() =>
            open(
              `https://data.nordpoolgroup.com/auction/day-ahead/prices?deliveryDate=latest&currency=EUR&aggregation=Hourly&deliveryAreas=${getRegion()}`,
            )
          }
        />
        <MenuBarExtra.Item
          icon={Icon.BarChart}
          title="Open Elering Dashboard"
          onAction={() => open("https://dashboard.elering.ee/et")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
