import { useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  fetchCountries,
  fetchRegions,
  fetchCities,
  fetchMetadata,
} from "./lib/api";
import { useDateRange } from "./lib/date-ranges";
import { DateRangeParams } from "./lib/types";
import { formatNumber, formatCurrency } from "./lib/format";

function CountryDetail({
  country,
  range,
  currency,
}: {
  country: string;
  range: DateRangeParams;
  currency: string;
}) {
  const regionParams = useMemo(
    () => ({ ...range, country, limit: 50 }),
    [range, country],
  );
  const cityParams = useMemo(
    () => ({ ...range, country, limit: 50 }),
    [range, country],
  );
  const { data: regions, isLoading: loadingRegions } = useCachedPromise(
    fetchRegions,
    [regionParams],
    { failureToastOptions: { title: "Failed to load regions" } },
  );
  const { data: cities, isLoading: loadingCities } = useCachedPromise(
    fetchCities,
    [cityParams],
    { failureToastOptions: { title: "Failed to load cities" } },
  );

  return (
    <List isLoading={loadingRegions || loadingCities} navigationTitle={country}>
      {regions && regions.length > 0 && (
        <List.Section title="Regions">
          {regions.map((r, i) => (
            <List.Item
              key={`region-${i}`}
              title={r.region || "Unknown"}
              icon={Icon.Map}
              accessories={[
                {
                  text: `${formatNumber(r.visitors)} visitors`,
                  icon: Icon.Person,
                  tooltip: "Total unique visitors",
                },
                ...(r.revenue > 0
                  ? [
                      {
                        text: formatCurrency(r.revenue, currency),
                        icon: Icon.BankNote,
                        tooltip: "Total revenue",
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Region"
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={r.region || "Unknown"}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {cities && cities.length > 0 && (
        <List.Section title="Cities">
          {cities.map((c, i) => (
            <List.Item
              key={`city-${i}`}
              title={c.city || "Unknown"}
              icon={Icon.Pin}
              accessories={[
                {
                  text: `${formatNumber(c.visitors)} visitors`,
                  icon: Icon.Person,
                  tooltip: "Total unique visitors",
                },
                ...(c.revenue > 0
                  ? [
                      {
                        text: formatCurrency(c.revenue, currency),
                        icon: Icon.BankNote,
                        tooltip: "Total revenue",
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy City"
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={c.city || "Unknown"}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Countries() {
  const { range, dropdown } = useDateRange("30d");

  const params = useMemo(() => ({ ...range, limit: 100 }), [range]);
  const { data, isLoading } = useCachedPromise(fetchCountries, [params], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load countries" },
  });
  const { data: metadata } = useCachedPromise(fetchMetadata, []);

  const currency = metadata?.currency || "USD";
  const countries = data || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search countries..."
      searchBarAccessory={dropdown}
    >
      <List.Section title={`${countries.length} Countries`}>
        {countries.map((c, i) => (
          <List.Item
            key={`${c.country}-${i}`}
            title={c.country}
            icon={c.image ? { source: c.image } : Icon.Globe}
            keywords={[c.country]}
            accessories={[
              {
                text: `${formatNumber(c.visitors)} visitors`,
                icon: Icon.Person,
                tooltip: "Total unique visitors",
              },
              ...(c.revenue > 0
                ? [
                    {
                      text: formatCurrency(c.revenue, currency),
                      icon: Icon.BankNote,
                      tooltip: "Total revenue",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Regions & Cities"
                  icon={Icon.Map}
                  target={
                    <CountryDetail
                      country={c.country}
                      range={range}
                      currency={currency}
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Country"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  content={c.country}
                />
                <Action.OpenInBrowser
                  title="Open Datafast Dashboard"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  url="https://datafa.st"
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {countries.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Country Data"
          description="Try a different date range"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
