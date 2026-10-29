import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { API, CityRates, Envelope, cityUrl, getJson, locale, money, priceIndexUrl, typeTitle } from "./api";
import { useCities } from "./search-spaces";

export default function MarketRates() {
  const { data: cities, isLoading } = useCities();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search a city">
      {(cities ?? []).map((c) => (
        <List.Item
          key={c.slug}
          icon={Icon.BarChart}
          title={c.name.trim()}
          subtitle={c.countryCode}
          accessories={[{ text: `${c.propertyCount} spaces` }]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Market Rates" icon={Icon.BarChart} target={<RatesDetail slug={c.slug} />} />
              <Action.OpenInBrowser title="Open Price Index" url={priceIndexUrl(c.slug)} />
              <Action.OpenInBrowser title="Open Coworking Spaces" url={cityUrl(c.slug)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RatesDetail({ slug }: { slug: string }) {
  const { data, isLoading } = useCachedPromise(
    async (url: string) => (await getJson<Envelope<{ cities: CityRates[] }>>(url)).data.cities[0] ?? null,
    [`${API}/v1/market/rates?locale=${locale()}&city=${encodeURIComponent(slug)}`],
  );

  const figures = data?.figures ?? [];
  const markdown = isLoading
    ? ""
    : !data || figures.length === 0
      ? "# Not enough published prices yet\n\nThis city has spaces on CoworkingView, but too few published prices to compute a fair median."
      : [
          `# What coworking costs in ${data.city.name.trim()}`,
          "| Workspace | Median | Middle half | Spaces |",
          "| --- | --- | --- | --- |",
          ...figures.map(
            (f) =>
              `| ${typeTitle(f.optionType)} | **${money(f.median)}**/month | ${
                f.p25 && f.p75 ? `${money(f.p25)} – ${money(f.p75)}` : "—"
              } | ${f.propertyCount} |`,
          ),
          data.dayPass
            ? `\nDay pass median: **${money(data.dayPass.median)}**/day (${data.dayPass.sampleSize} spaces)`
            : "",
          data.meetingRoom
            ? `\nMeeting room median: **${money(data.meetingRoom.median)}**/hour (${data.meetingRoom.sampleSize} spaces)`
            : "",
          "\n_Medians over the spaces that publish a price. Source: CoworkingView Price Index, CC BY 4.0._",
        ]
          .filter(Boolean)
          .join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={data?.city.name.trim() ?? "Market Rates"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Price Index" url={priceIndexUrl(slug)} />
          <Action.OpenInBrowser title="Open Coworking Spaces" url={cityUrl(slug)} />
        </ActionPanel>
      }
    />
  );
}
