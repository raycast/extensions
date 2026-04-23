import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const API_URL = "https://api.data.gov.my/data-catalogue?id=fuelprice&sort=-date&limit=2";

interface FuelPrice {
  series_type: "level" | "change_weekly";
  date: string;
  ron95: number;
  ron97: number;
  diesel: number;
  diesel_eastmsia: number;
  ron95_budi95: number | null;
  ron95_skps: number | null;
}

function formatRM(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return `RM ${value.toFixed(2)}`;
}

function formatChange(value: number | null): string {
  if (value === null || value === undefined) return "";
  if (value === 0) return "No change";
  const sign = value > 0 ? "+" : "";
  const sen = Math.round(value * 100);
  return `${sign}${sen} sen`;
}

function getChangeColor(value: number | null): Color {
  if (value === null || value === undefined) return Color.SecondaryText;
  if (value > 0) return Color.Red;
  if (value < 0) return Color.Green;
  return Color.SecondaryText;
}

function getChangeIcon(value: number | null): Icon {
  if (value === null || value === undefined) return Icon.Minus;
  if (value > 0) return Icon.ArrowUp;
  if (value < 0) return Icon.ArrowDown;
  return Icon.Minus;
}

function getEffectiveDateRange(dateStr: string): string {
  const start = new Date(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return `${start.toLocaleDateString("en-MY", opts)} - ${end.toLocaleDateString("en-MY", opts)}`;
}

export default function Command() {
  const { isLoading, data, error } = useFetch<FuelPrice[]>(API_URL);

  if (error) return <List.EmptyView title="Failed to load prices" description={error.message} />;

  const level = data?.find((d) => d.series_type === "level");
  const change = data?.find((d) => d.series_type === "change_weekly");

  const dateRange = level ? getEffectiveDateRange(level.date) : "Loading...";

  const fuelItems = level
    ? [
        {
          title: "RON 95",
          subtitle: "(Unsubsidized)",
          price: level.ron95,
          change: change?.ron95 ?? null,
          icon: "⛽",
        },
        {
          title: "RON 95 (BUDI95)",
          subtitle: "Subsidized",
          price: level.ron95_budi95,
          change: null,
          icon: "🏷️",
        },
        {
          title: "RON 95 (SKPS)",
          subtitle: "Commercial vehicles",
          price: level.ron95_skps,
          change: null,
          icon: "🚛",
        },
        {
          title: "RON 97",
          subtitle: "",
          price: level.ron97,
          change: change?.ron97 ?? null,
          icon: "⛽",
        },
        {
          title: "Diesel (Peninsular)",
          subtitle: "West Malaysia",
          price: level.diesel,
          change: change?.diesel ?? null,
          icon: "🛢️",
        },
        {
          title: "Diesel (East Malaysia)",
          subtitle: "Sabah, Sarawak & Labuan",
          price: level.diesel_eastmsia,
          change: change?.diesel_eastmsia ?? null,
          icon: "🛢️",
        },
      ]
    : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search fuel type...">
      <List.Section title="Fuel Prices" subtitle={dateRange}>
        {fuelItems
          .filter((item) => item.price !== null)
          .map((item) => (
            <List.Item
              key={item.title}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              accessories={[
                ...(item.change !== null
                  ? [
                      {
                        tag: {
                          value: formatChange(item.change),
                          color: getChangeColor(item.change),
                        },
                        icon: {
                          source: getChangeIcon(item.change),
                          tintColor: getChangeColor(item.change),
                        },
                      },
                    ]
                  : []),
                { text: { value: formatRM(item.price), color: Color.PrimaryText } },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Price" content={formatRM(item.price)} />
                  <Action.CopyToClipboard
                    title="Copy All Prices"
                    content={fuelItems
                      .filter((f) => f.price !== null)
                      .map((f) => `${f.title}: ${formatRM(f.price)}`)
                      .join("\n")}
                  />
                  <Action.OpenInBrowser
                    title="View on Data.gov.my"
                    url="https://data.gov.my/data-catalogue/fuelprice"
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      <List.Section title="Info">
        <List.Item
          icon={Icon.Calendar}
          title="Effective Period"
          subtitle={dateRange}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Source Data"
                url="https://data.gov.my/data-catalogue/fuelprice"
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Info}
          title="Source"
          subtitle="Ministry of Finance via data.gov.my (CC BY 4.0)"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Data.gov.my"
                url="https://data.gov.my/data-catalogue/fuelprice"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
