import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchFuelPrices } from "./fetch-prices";

const SOURCE_URL = "https://psopk.com/en/fuels/fuel-prices";

export default function Command() {
  const {
    data: sections,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchFuelPrices, [], {
    // Show the last successful result instantly on open, then refresh in
    // the background — avoids a blank/spinner state on every launch.
    keepPreviousData: true,
    initialData: [],
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter fuel products...">
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load fuel prices"
          description={error.message}
        />
      )}

      {!error && !isLoading && sections.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No prices found"
          description="PSO may have changed their page layout."
        />
      )}

      {sections.map((section, sectionIndex) => (
        <List.Section
          key={`section-${sectionIndex}`}
          title={section.title}
          subtitle={section.effectiveFrom ? `Effective from ${section.effectiveFrom}` : undefined}
        >
          {section.prices.map((item, itemIndex) => (
            <List.Item
              key={`section-${sectionIndex}-item-${itemIndex}`}
              icon={iconFor(item.product)}
              title={item.product}
              accessories={[{ text: item.price }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Price" content={item.price} />
                  <Action.CopyToClipboard
                    title="Copy Product & Price"
                    content={`${item.product}: ${item.price}`}
                  />
                  <Action.OpenInBrowser title="Open Pso Fuel Prices Page" url={SOURCE_URL} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

/** Pick a tinted icon per product so the list is scannable at a glance. */
function iconFor(product: string): { source: Icon; tintColor: Color } {
  const p = product.toLowerCase();
  if (p.includes("cetane") || p.includes("diesel") || p.includes("hsd")) {
    return { source: Icon.Car, tintColor: Color.Orange };
  }
  if (p.includes("premier") || p.includes("octane")) {
    return { source: Icon.Car, tintColor: Color.Green };
  }
  if (p.includes("lpg")) {
    return { source: Icon.Bolt, tintColor: Color.Blue };
  }
  if (p.includes("jp-1") || p.includes("sko")) {
    return { source: Icon.Airplane, tintColor: Color.Purple };
  }
  return { source: Icon.Coins, tintColor: Color.Green };
}
