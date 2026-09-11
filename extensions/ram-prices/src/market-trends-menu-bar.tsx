import { MenuBarExtra } from "@raycast/api";
import { useMarketTrends } from "./hooks/use-market-trends";
import { formatShortDate, formatUsdPerGb, getTrendAccessory } from "./utils/format";

export default function Command() {
  const { data, isLoading } = useMarketTrends();
  const series = data?.series ?? [];
  const title =
    series.length > 0
      ? series.map((entry) => `${entry.generation} ${formatUsdPerGb(entry.latest.avgPricePerGb)}`).join(" · ")
      : "RAM Trends";

  return (
    <MenuBarExtra title={title} isLoading={isLoading}>
      {series.length === 0 ? <MenuBarExtra.Item title="No RAM market trends available" /> : null}

      {series.map((entry) => (
        <MenuBarExtra.Item
          key={entry.generation}
          title={`${entry.generation} ${formatUsdPerGb(entry.latest.avgPricePerGb)}`}
          subtitle={getTrendAccessory(entry.changePercent).text}
        />
      ))}

      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item title="Last Updated" subtitle={formatShortDate(data?.lastUpdated)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
