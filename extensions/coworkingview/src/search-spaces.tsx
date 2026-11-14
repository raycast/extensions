import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import {
  API,
  City,
  Envelope,
  Space,
  SpaceSummary,
  WORKSPACE_TYPES,
  cityUrl,
  getJson,
  locale,
  money,
  per,
  spaceUrl,
  typeTitle,
} from "./api";

const PAGE_SIZE = 50;

export function useCities() {
  return useCachedPromise(
    async (url: string) => {
      const body = await getJson<Envelope<{ cities: City[] }>>(url);
      return [...body.data.cities].sort((a, b) => b.propertyCount - a.propertyCount || a.name.localeCompare(b.name));
    },
    [`${API}/v1/geo/bootstrap?locale=${locale()}`],
    { keepPreviousData: true },
  );
}

const VERDICT_COLOR = { below: Color.Green, around: Color.Blue, above: Color.Orange } as const;

export default function SearchSpaces() {
  const [city, setCity] = useCachedState<string>("city", "berlin");
  const [type, setType] = useState<string>("");
  const { data: cities, isLoading: citiesLoading } = useCities();

  const { data, isLoading, pagination } = useCachedPromise(
    (city: string, type: string) => async (options: { page: number }) => {
      const q = new URLSearchParams({
        locale: locale(),
        city,
        pageSize: String(PAGE_SIZE),
        page: String(options.page + 1),
      });
      if (type) q.set("pricingOptionType", type);
      const body = await getJson<Envelope<SpaceSummary[]>>(`${API}/v1/properties?${q}`);
      const p = body.meta.pagination;
      return { data: body.data, hasMore: p ? p.page < p.pageCount : false };
    },
    [city, type],
    { keepPreviousData: true, initialData: [] },
  );

  const cityName = cities?.find((c) => c.slug === city)?.name ?? city;

  return (
    <List
      isLoading={isLoading || citiesLoading}
      pagination={pagination}
      searchBarPlaceholder={`Filter spaces in ${cityName}${type ? ` · ${typeTitle(type)}` : ""}`}
      searchBarAccessory={
        <List.Dropdown tooltip="City" value={city} onChange={setCity} storeValue>
          {(cities ?? []).map((c) => (
            <List.Dropdown.Item key={c.slug} value={c.slug} title={`${c.name} (${c.propertyCount})`} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Building}
        title={isLoading ? "Loading spaces…" : "No spaces match"}
        description={!isLoading && type ? "Try another workspace type with ⌘T." : undefined}
        actions={
          <ActionPanel>
            {type ? (
              <Action title="Show Any Type" icon={Icon.Filter} onAction={() => setType("")} />
            ) : (
              <Action.OpenInBrowser title={`Open All Spaces in ${cityName}`} url={cityUrl(city)} />
            )}
            <WorkspaceTypeSubmenu type={type} onTypeChange={setType} />
            {type ? <Action.OpenInBrowser title={`Open All Spaces in ${cityName}`} url={cityUrl(city)} /> : null}
          </ActionPanel>
        }
      />
      {(data ?? []).map((space) => (
        <List.Item
          key={space.slug}
          icon={Icon.Building}
          title={space.title.trim()}
          subtitle={[space.zone?.name, space.operator?.name].filter(Boolean).join(" · ")}
          keywords={[space.zone?.name, space.operator?.name, ...space.amenities].filter((k): k is string => !!k)}
          accessories={[
            ...(space.capacity ? [{ icon: Icon.TwoPeople, text: String(space.capacity), tooltip: "Up to" }] : []),
            ...(space.fromPrice
              ? [
                  {
                    tag: {
                      value: `from ${money(space.fromPrice)}${per(space.fromBillingPeriod)}`,
                      color: space.marketPosition ? VERDICT_COLOR[space.marketPosition.verdict] : Color.SecondaryText,
                    },
                    tooltip: space.marketPosition ? `${space.marketPosition.verdict} the local median` : undefined,
                  },
                ]
              : [{ text: "Price on request" }]),
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" icon={Icon.Sidebar} target={<SpaceDetail slug={space.slug} />} />
              <Action.OpenInBrowser url={spaceUrl(space.slug)} />
              <Action.CopyToClipboard title="Copy Link" content={spaceUrl(space.slug)} />
              <WorkspaceTypeSubmenu type={type} onTypeChange={setType} />
              <Action.OpenInBrowser title={`Open All Spaces in ${cityName}`} url={cityUrl(city)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function WorkspaceTypeSubmenu({ type, onTypeChange }: { type: string; onTypeChange: (type: string) => void }) {
  return (
    <ActionPanel.Submenu title="Workspace Type…" icon={Icon.Filter} shortcut={{ modifiers: ["cmd"], key: "t" }}>
      <Action title="Any Type" icon={type === "" ? Icon.Checkmark : Icon.Circle} onAction={() => onTypeChange("")} />
      {WORKSPACE_TYPES.map((t) => (
        <Action
          key={t.value}
          title={t.title}
          icon={type === t.value ? Icon.Checkmark : Icon.Circle}
          onAction={() => onTypeChange(t.value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function SpaceDetail({ slug }: { slug: string }) {
  const { data, isLoading } = useCachedPromise(
    async (url: string) => (await getJson<Envelope<Space>>(url)).data,
    [`${API}/v1/properties/${encodeURIComponent(slug)}?locale=${locale()}`],
  );

  const markdown = data
    ? [
        `# ${data.title.trim()}`,
        data.images[0] ? `![${data.title}](${data.images[0].url})` : "",
        data.address,
        "## Prices",
        data.pricingOptions.length
          ? [
              "| Workspace | Price | People |",
              "| --- | --- | --- |",
              ...data.pricingOptions.map((o) => {
                const price = o.price ? `${money(o.price)}${per(o.billingPeriod)}` : "On request";
                const people =
                  o.minCapacity || o.maxCapacity ? [o.minCapacity, o.maxCapacity].filter(Boolean).join("–") : "";
                return `| ${o.title || typeTitle(o.optionType)} | ${price} | ${people} |`;
              }),
            ].join("\n")
          : "No published prices.",
        data.description ? `## About\n${data.description}` : "",
        "",
        "_Prices are what the operator publishes. Open the space on CoworkingView for the current offer._",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={data?.title.trim() ?? "Space"}
      metadata={
        data ? (
          <Detail.Metadata>
            {data.city ? <Detail.Metadata.Label title="City" text={data.city.name.trim()} /> : null}
            {data.zone ? <Detail.Metadata.Label title="District" text={data.zone.name} /> : null}
            {data.operator ? <Detail.Metadata.Label title="Operator" text={data.operator.name} /> : null}
            {data.capacity ? <Detail.Metadata.Label title="Capacity" text={`Up to ${data.capacity}`} /> : null}
            {data.marketPosition ? (
              <Detail.Metadata.TagList title="Price vs. Market">
                <Detail.Metadata.TagList.Item
                  text={`${data.marketPosition.verdict} median (${money(data.marketPosition.median)})`}
                  color={VERDICT_COLOR[data.marketPosition.verdict]}
                />
              </Detail.Metadata.TagList>
            ) : null}
            {data.amenities.length ? (
              <Detail.Metadata.TagList title="Amenities">
                {data.amenities.slice(0, 12).map((a) => (
                  <Detail.Metadata.TagList.Item key={a} text={a.replace(/_/g, " ")} />
                ))}
              </Detail.Metadata.TagList>
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="CoworkingView" target={data.webUrl} text="Open listing" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        data ? (
          <ActionPanel>
            <Action.OpenInBrowser url={data.webUrl} />
            <Action.CopyToClipboard title="Copy Link" content={data.webUrl} />
            {data.address ? <Action.CopyToClipboard title="Copy Address" content={data.address} /> : null}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
