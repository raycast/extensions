import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";

import {
  dashboardUrl,
  formatCompactNumber,
  formatRevenue,
  formatRevenueAmount,
  getOverview,
  getRevenue,
  getTopPages,
  listSites,
  useKobbeQuery,
} from "./api";
import { getKobbePreferences } from "./preferences";
import type { KobbeSite, KobbeTopPage, TimeRange } from "./types";
import type { ReactElement } from "react";

function siteDomain(site: KobbeSite): string {
  return site.domain || "No domain";
}

function siteCreatedDate(site: KobbeSite): Date | undefined {
  return site.createdAt > 0 ? new Date(site.createdAt) : undefined;
}

function topPageAccessories(page: Pick<KobbeTopPage, "visitors" | "views">) {
  return [
    { text: `${formatCompactNumber(page.visitors)} visitors` },
    { text: `${formatCompactNumber(page.views)} views` },
  ];
}

function TopPageActions(props: { siteId: string; range: TimeRange; path: string; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Path" content={props.path} />
      <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(props.siteId, props.range)} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={props.onRefresh}
      />
    </ActionPanel>
  );
}

export function SiteActions(props: { site: KobbeSite; range?: TimeRange; onRefresh?: () => void }) {
  const range = props.range ?? getKobbePreferences().defaultRange;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(props.site.id, range)} />
        <Action.Push
          title="View Overview"
          icon={Icon.BarChart}
          target={<SiteOverviewDetail site={props.site} range={range} />}
        />
        <Action.Push
          title="View Top Pages"
          icon={Icon.List}
          target={<TopPagesList site={props.site} range={range} />}
        />
        <Action.Push
          title="View Revenue"
          icon={Icon.Coins}
          target={<RevenueDetail site={props.site} range={range} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.onRefresh ? (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={props.onRefresh}
          />
        ) : null}
        <Action.CopyToClipboard title="Copy Site ID" content={props.site.id} />
        <Action.CopyToClipboard title="Copy Domain" content={props.site.domain ?? ""} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function SiteListItem(props: { site: KobbeSite; range?: TimeRange; onRefresh?: () => void }) {
  const createdAt = siteCreatedDate(props.site);

  return (
    <List.Item
      title={props.site.name}
      subtitle={siteDomain(props.site)}
      icon="assets/extension-icon.png"
      accessories={[...(createdAt ? [{ date: createdAt, tooltip: "Created" }] : [])]}
      actions={<SiteActions site={props.site} range={props.range} onRefresh={props.onRefresh} />}
    />
  );
}

export function SitesPicker(props: {
  title: string;
  searchBarPlaceholder: string;
  emptyViewTitle?: string;
  renderActions: (site: KobbeSite, revalidate: () => void) => ReactElement;
}) {
  const sites = useKobbeQuery(listSites);

  return (
    <List isLoading={sites.isLoading} searchBarPlaceholder={props.searchBarPlaceholder} navigationTitle={props.title}>
      {sites.error ? (
        <List.EmptyView
          title="Could not load Kobbe sites"
          description={sites.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={sites.revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
      {sites.data?.length === 0 ? (
        <List.EmptyView
          title={props.emptyViewTitle ?? "No sites found"}
          description="Create a site in Kobbe first, then come back to Raycast."
        />
      ) : null}
      {sites.data?.map((site) => {
        const createdAt = siteCreatedDate(site);

        return (
          <List.Item
            key={site.id}
            title={site.name}
            subtitle={siteDomain(site)}
            icon="assets/extension-icon.png"
            accessories={[...(createdAt ? [{ date: createdAt, tooltip: "Created" }] : [])]}
            actions={props.renderActions(site, sites.revalidate)}
          />
        );
      })}
    </List>
  );
}

export function SiteOverviewDetail(props: { site: KobbeSite; range?: TimeRange }) {
  const range = props.range ?? getKobbePreferences().defaultRange;
  const overview = useKobbeQuery(() => getOverview(props.site.id, range), [props.site.id, range]);
  const data = overview.data?.overview;

  return (
    <List
      isLoading={overview.isLoading}
      navigationTitle={`${props.site.name} Overview`}
      searchBarPlaceholder="Search overview..."
    >
      {overview.error ? (
        <List.EmptyView
          title="Could not load overview"
          description={overview.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={overview.revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
      {data ? (
        <>
          <List.Section title={`${siteDomain(props.site)} · ${data.range}`} />
          <List.Section title="Traffic">
            <List.Item
              icon={Icon.Person}
              title="Visitors"
              accessories={[{ text: data.kpis.visitors }]}
              actions={<SiteActions site={props.site} range={range} onRefresh={overview.revalidate} />}
            />
            <List.Item
              icon={Icon.Eye}
              title="Views"
              accessories={[{ text: data.kpis.views }]}
              actions={<SiteActions site={props.site} range={range} onRefresh={overview.revalidate} />}
            />
          </List.Section>
          <List.Section title="Engagement">
            <List.Item
              icon={Icon.TwoPeople}
              title="Visits"
              accessories={[{ text: data.kpis.visits }]}
              actions={<SiteActions site={props.site} range={range} onRefresh={overview.revalidate} />}
            />
            <List.Item
              icon={Icon.Clock}
              title="Avg Session"
              accessories={[{ text: data.kpis.sessionTime }]}
              actions={<SiteActions site={props.site} range={range} onRefresh={overview.revalidate} />}
            />
            <List.Item
              icon={Icon.PieChart}
              title="Bounce Rate"
              accessories={[{ text: data.kpis.bounceRate }]}
              actions={<SiteActions site={props.site} range={range} onRefresh={overview.revalidate} />}
            />
          </List.Section>
          <List.Section title="Revenue">
            <List.Item
              icon={Icon.Coins}
              title="Revenue"
              accessories={[{ text: formatRevenue(data.revenue) }, { text: `${data.revenue.orders} orders` }]}
              actions={<SiteActions site={props.site} range={range} onRefresh={overview.revalidate} />}
            />
          </List.Section>
          <List.Section title="Top Pages">
            {data.topPages.length ? (
              data.topPages
                .slice(0, 9)
                .map((page) => (
                  <List.Item
                    key={page.path}
                    icon={Icon.Document}
                    title={page.path}
                    accessories={topPageAccessories(page)}
                    actions={
                      <TopPageActions
                        siteId={props.site.id}
                        range={range}
                        path={page.path}
                        onRefresh={overview.revalidate}
                      />
                    }
                  />
                ))
            ) : (
              <List.Item icon={Icon.Document} title="No page data" subtitle="No pageviews in this range" />
            )}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

export function TopPagesList(props: { site: KobbeSite; range?: TimeRange }) {
  const range = props.range ?? getKobbePreferences().defaultRange;
  const pages = useKobbeQuery(() => getTopPages(props.site.id, range), [props.site.id, range]);

  return (
    <List
      isLoading={pages.isLoading}
      navigationTitle={`${props.site.name} Top Pages`}
      searchBarPlaceholder="Search pages..."
    >
      {pages.error ? (
        <List.EmptyView
          title="Could not load top pages"
          description={pages.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={pages.revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
      {pages.data?.pages.length === 0 ? (
        <List.EmptyView
          title="No page data"
          description="Kobbe has not recorded pageviews for this site in the selected range."
        />
      ) : null}
      {pages.data?.pages.map((page) => (
        <List.Item
          key={page.path}
          title={page.path}
          icon={Icon.Document}
          accessories={topPageAccessories(page)}
          actions={
            <TopPageActions siteId={props.site.id} range={range} path={page.path} onRefresh={pages.revalidate} />
          }
        />
      ))}
    </List>
  );
}

export function RevenueDetail(props: { site: KobbeSite; range?: TimeRange }) {
  const range = props.range ?? getKobbePreferences().defaultRange;
  const revenue = useKobbeQuery(async () => {
    const [revenueResponse, overviewResponse] = await Promise.all([
      getRevenue(props.site.id, range),
      getOverview(props.site.id, range),
    ]);
    return { revenueResponse, overviewResponse };
  }, [props.site.id, range]);
  const data = revenue.data?.revenueResponse;
  const overview = revenue.data?.overviewResponse.overview;
  const topPagesMarkdown = overview?.topPages.length
    ? overview.topPages
        .slice(0, 5)
        .map(
          (page) =>
            `- **${page.path}** · ${formatCompactNumber(
              page.visitors,
            )} visitors · ${formatCompactNumber(page.views)} views`,
        )
        .join("\n")
    : "No page data in this range.";
  const topSourcesMarkdown = overview?.sources.length
    ? overview.sources
        .slice(0, 5)
        .map(
          (source) =>
            `- **${source.source}** · ${formatCompactNumber(
              source.visitors,
            )} visitors · ${formatCompactNumber(source.views)} views`,
        )
        .join("\n")
    : "No source data in this range.";

  const markdown = data
    ? data.revenue.orders > 0
      ? [
          "# Revenue",
          "",
          `## ${formatRevenue(data.revenue)}`,
          "",
          `${data.revenue.orders} orders · ${data.range}`,
          "",
          `${formatRevenueAmount(
            data.revenue.attributedAmount,
            data.revenue.currency,
            data.revenue.multipleCurrencies,
          )} attributed · ${data.revenue.attributedPercent} attribution rate`,
          "",
          "## Top Pages",
          "",
          topPagesMarkdown,
          "",
          "## Top Sources",
          "",
          topSourcesMarkdown,
        ].join("\n")
      : [
          "# Revenue",
          "",
          `No revenue recorded for **${data.range}**.`,
          "",
          "If you expect revenue here, check that the full tracker is installed and that the revenue webhook is configured for this site.",
          "",
          "## Top Pages",
          "",
          topPagesMarkdown,
        ].join("\n")
    : "Loading Kobbe revenue...";

  return (
    <Detail
      isLoading={revenue.isLoading}
      markdown={markdown}
      navigationTitle={`${props.site.name} Revenue`}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Site" text={props.site.name} />
            <Detail.Metadata.Label title="Domain" text={siteDomain(props.site)} />
            <Detail.Metadata.Label title="Range" text={data.range} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Total" text={formatRevenue(data.revenue)} />
            <Detail.Metadata.Label title="Orders" text={String(data.revenue.orders)} />
            <Detail.Metadata.Label
              title="Attributed"
              text={formatRevenueAmount(
                data.revenue.attributedAmount,
                data.revenue.currency,
                data.revenue.multipleCurrencies,
              )}
            />
            <Detail.Metadata.Label title="Attribution Rate" text={data.revenue.attributedPercent} />
            <Detail.Metadata.Link title="Dashboard" text="Open in Kobbe" target={dashboardUrl(props.site.id, range)} />
          </Detail.Metadata>
        ) : null
      }
      actions={<SiteActions site={props.site} range={range} onRefresh={revenue.revalidate} />}
    />
  );
}
