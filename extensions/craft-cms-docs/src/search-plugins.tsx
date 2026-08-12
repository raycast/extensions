import { Action, ActionPanel, Color, Detail, Grid, Icon, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchCoreData, fetchPluginStorePage } from "./api";
import type { Category, Plugin } from "./types";

const PER_PAGE = 48;

function getLowestPrice(plugin: Plugin): number | null {
  const prices = plugin.editions.map((e) => e.price).filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.min(...prices) : null;
}

function matchesFilter(plugin: Plugin, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "free") return plugin.editions.some((e) => e.price === null);
  if (filter === "paid") return getLowestPrice(plugin) !== null;
  if (filter === "cloud") return plugin.cloudTested;
  if (filter === "gql") return plugin.supportsGql;
  if (filter.startsWith("cat:")) {
    const id = parseInt(filter.slice(4), 10);
    return plugin.categoryIds.includes(id);
  }
  return true;
}

function matchesQuery(plugin: Plugin, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    plugin.name.toLowerCase().includes(q) ||
    plugin.handle.toLowerCase().includes(q) ||
    plugin.developerName.toLowerCase().includes(q) ||
    (plugin.shortDescription ?? "").toLowerCase().includes(q) ||
    plugin.packageName.toLowerCase().includes(q) ||
    plugin.keywords.some((k) => k.toLowerCase().includes(q))
  );
}

async function fetchAllPlugins(options?: { signal?: AbortSignal }): Promise<Plugin[]> {
  const signal = options?.signal;
  const all: Plugin[] = [];
  let page = 1;
  while (true) {
    const result = await fetchPluginStorePage(page, 200, { signal });
    all.push(...result.plugins.filter((p) => !p.abandoned));
    if (result.nextPage === null) break;
    if (signal?.aborted) throw new Error("aborted");
    page++;
  }
  return all;
}

type Props = LaunchProps<{ arguments: { term?: string } }>;

export default function SearchPlugins(props: Props) {
  const initialSearchText = props.arguments?.term?.trim() ?? "";
  const [searchText, setSearchText] = useState(initialSearchText);
  const [filter, setFilter] = useState("all");
  const isSearching = searchText.trim().length > 0;
  const shouldFetchAll = isSearching || filter !== "all";

  const {
    data: pagedPlugins,
    isLoading: isBrowseLoading,
    pagination,
  } = useCachedPromise(
    () => async (options: { page: number }) => {
      const result = await fetchPluginStorePage(options.page + 1, PER_PAGE);
      return { data: result.plugins.filter((p) => !p.abandoned), hasMore: result.nextPage !== null };
    },
    [],
    { keepPreviousData: true, execute: !shouldFetchAll },
  );

  const { data: allPlugins, isLoading: isSearchLoading } = useCachedPromise(fetchAllPlugins, [], {
    execute: shouldFetchAll,
    keepPreviousData: true,
  });

  const { data: coreData } = useCachedPromise(fetchCoreData, []);
  const categories = coreData?.categories ?? [];

  const isLoading = shouldFetchAll ? isSearchLoading : isBrowseLoading;

  const results = useMemo(() => {
    const query = searchText.trim();
    const source = shouldFetchAll ? (allPlugins ?? []) : (pagedPlugins ?? []);
    const seen = new Set<number>();
    return source
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .filter((p) => matchesFilter(p, filter))
      .filter((p) => matchesQuery(p, query));
  }, [allPlugins, pagedPlugins, searchText, filter, shouldFetchAll]);

  return (
    <Grid
      columns={6}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      pagination={shouldFetchAll ? undefined : pagination}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Craft Plugins…"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter" onChange={setFilter}>
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item
              title="All Plugins"
              value="all"
              icon={{ source: "icons/plugins.svg", tintColor: Color.SecondaryText }}
            />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item
              title="Free Editions"
              value="free"
              icon={{ source: "icons/free.svg", tintColor: Color.SecondaryText }}
            />
            <Grid.Dropdown.Item
              title="Paid Editions"
              value="paid"
              icon={{ source: "icons/paid.svg", tintColor: Color.SecondaryText }}
            />
            <Grid.Dropdown.Item
              title="Cloud Compatible"
              value="cloud"
              icon={{ source: "icons/cloud.svg", tintColor: Color.SecondaryText }}
            />
            <Grid.Dropdown.Item
              title="GraphQL Compatible"
              value="gql"
              icon={{ source: "icons/graphql.svg", tintColor: Color.SecondaryText }}
            />
          </Grid.Dropdown.Section>
          {categories.length > 0 ? (
            <Grid.Dropdown.Section>
              {categories.map((cat) => (
                <Grid.Dropdown.Item
                  key={cat.id}
                  title={cat.title}
                  value={`cat:${cat.id}`}
                  icon={{ source: cat.iconUrl }}
                />
              ))}
            </Grid.Dropdown.Section>
          ) : null}
        </Grid.Dropdown>
      }
    >
      {results.length === 0 && !isLoading ? (
        <Grid.EmptyView title="No Plugins Found" description="Try a different search or filter" />
      ) : results.length === 0 && shouldFetchAll && isSearchLoading ? (
        <Grid.EmptyView
          title=""
          icon={{ source: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }}
        />
      ) : null}
      {results.map((plugin) => (
        <PluginItem key={plugin.id} plugin={plugin} categories={categories} />
      ))}
    </Grid>
  );
}

function shellCommand(plugin: Plugin): string {
  return `composer require "${plugin.packageName}:^${plugin.version}" -w && php craft plugin/install ${plugin.handle}`;
}

function ddevCommand(plugin: Plugin): string {
  return `ddev composer require "${plugin.packageName}:^${plugin.version}" -w && ddev craft plugin/install ${plugin.handle}`;
}

function InstallActions({ plugin }: { plugin: Plugin }) {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        title="Copy Shell Command"
        content={shellCommand(plugin)}
        icon={{ source: "icons/terminal.svg", tintColor: Color.SecondaryText }}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
      />
      <Action.CopyToClipboard
        title="Copy DDEV Command"
        content={ddevCommand(plugin)}
        icon={{ source: "icons/terminal.svg", tintColor: Color.SecondaryText }}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
    </ActionPanel.Section>
  );
}

function PluginItem({ plugin, categories }: { plugin: Plugin; categories: Category[] }) {
  const price = getLowestPrice(plugin);
  const editionPrices = plugin.editions.map((e) => (e.price !== null ? `$${e.price}` : "Free")).join(" · ");

  return (
    <Grid.Item
      title={plugin.name}
      subtitle={plugin.developerName}
      content={plugin.iconUrl ? { source: plugin.iconUrl } : { source: Icon.Box }}
      accessory={
        price !== null
          ? { icon: { source: "icons/paid.svg", tintColor: Color.SecondaryText }, tooltip: editionPrices }
          : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={{ source: "icons/detail.svg", tintColor: Color.SecondaryText }}
            target={<PluginDetail plugin={plugin} categories={categories} />}
          />
          <Action.OpenInBrowser
            url={plugin.url}
            title="Open in Plugin Store"
            icon={{ source: "icons/world.svg", tintColor: Color.SecondaryText }}
          />
          {plugin.supportLink ? (
            <Action.OpenInBrowser
              url={plugin.supportLink}
              title="Open Support Link"
              icon={{ source: "icons/world.svg", tintColor: Color.SecondaryText }}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          ) : null}
          <InstallActions plugin={plugin} />
        </ActionPanel>
      }
    />
  );
}

function PluginDetail({ plugin, categories }: { plugin: Plugin; categories: Category[] }) {
  const pluginCategories = categories.filter((c) => plugin.categoryIds.includes(c.id));

  const lines: string[] = [];
  if (plugin.iconUrl) {
    lines.push(`![Icon](${plugin.iconUrl}?raycast-width=128&raycast-height=128)`);
    lines.push("");
  }
  lines.push(`# ${plugin.name}`);
  lines.push("");
  if (plugin.shortDescription) {
    lines.push(plugin.shortDescription);
    lines.push("");
  }

  const editionsWithFeatures = plugin.editions.filter((e) => e.features && e.features.length > 0);
  if (editionsWithFeatures.length > 0) {
    lines.push("---");
    lines.push("");
    const editionPriceLabel = (e: (typeof editionsWithFeatures)[0]) => {
      if (e.price === null) return "`Free`";
      const renewal = e.renewalPrice !== null ? ` · $${e.renewalPrice}/year` : "";
      return `\`$${e.price}${renewal}\``;
    };

    if (plugin.editions.length === 1) {
      const edition = editionsWithFeatures[0];
      lines.push(`**${edition.name}** ${editionPriceLabel(edition)}`);
      if (edition.features) {
        for (const f of edition.features) {
          lines.push(`- ${f.name}`);
        }
      }
    } else {
      for (let i = 0; i < editionsWithFeatures.length; i++) {
        const edition = editionsWithFeatures[i];
        if (i > 0) {
          lines.push("");
          lines.push("---");
          lines.push("");
        }
        lines.push(`**${edition.name}** ${editionPriceLabel(edition)}`);
        if (edition.features) {
          for (const f of edition.features) {
            lines.push(`- ${f.name}`);
          }
        }
      }
    }
  }

  return (
    <Detail
      markdown={lines.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title={plugin.editions.length === 1 ? "Price" : "Editions"}>
            {plugin.editions.map((e) => (
              <Detail.Metadata.TagList.Item
                key={e.id}
                text={
                  plugin.editions.length === 1
                    ? e.price !== null
                      ? `$${e.price}`
                      : "Free"
                    : `${e.name}: ${e.price !== null ? `$${e.price}` : "Free"}`
                }
                color={e.price !== null ? Color.Red : Color.Green}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Developer"
            target={`https://plugins.craftcms.com/developer/${plugin.developerSlug}`}
            text={plugin.developerName}
          />
          <Detail.Metadata.Link
            title="Version"
            target={`https://plugins.craftcms.com/${plugin.handle}/changelog#v${plugin.version}`}
            text={plugin.version}
          />
          <Detail.Metadata.Label title="Active Installs" text={plugin.activeInstalls.toLocaleString()} />
          <Detail.Metadata.Label
            title="Last Updated"
            text={new Date(plugin.lastUpdate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          {plugin.totalReviews > 0 ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link
                title="Reviews"
                target={`https://plugins.craftcms.com/${plugin.handle}/reviews`}
                text={`${plugin.totalReviews} review${plugin.totalReviews === 1 ? "" : "s"}`}
              />
              {plugin.ratingAvg !== null ? (
                <Detail.Metadata.Label title="Rating" text={`${plugin.ratingAvg}/5`} />
              ) : null}
            </>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Craft Cloud Compatible" text={plugin.cloudTested ? "Yes" : "No"} />
          <Detail.Metadata.Label title="GraphQL Compatible" text={plugin.supportsGql ? "Yes" : "No"} />
          <Detail.Metadata.Separator />
          {pluginCategories.length > 0 ? (
            <Detail.Metadata.TagList title="Categories">
              {pluginCategories.map((c) => (
                <Detail.Metadata.TagList.Item key={c.id} text={c.title} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {plugin.keywords.length > 0 ? (
            <Detail.Metadata.TagList title="Keywords">
              {plugin.keywords.map((k, i) => (
                <Detail.Metadata.TagList.Item key={i} text={k} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Plugin Store" target={plugin.url} text="View Listing" />
          {plugin.supportLink ? (
            <Detail.Metadata.Link title="Support" target={plugin.supportLink} text="Get Support" />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={plugin.url}
            title="Open in Plugin Store"
            icon={{ source: "icons/world.svg", tintColor: Color.SecondaryText }}
          />
          {plugin.supportLink ? (
            <Action.OpenInBrowser
              url={plugin.supportLink}
              title="Open Support Link"
              icon={{ source: "icons/world.svg", tintColor: Color.SecondaryText }}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          ) : null}
          <InstallActions plugin={plugin} />
        </ActionPanel>
      }
    />
  );
}
