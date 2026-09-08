import { Action, ActionPanel, Color, Detail, Icon, Image, List, Keyboard } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import {
  dashboardUrl,
  formatCompactNumber,
  formatRevenue,
  formatRevenueAmount,
  getOverview,
  getRevenueWithOverview,
  getSetupHealth,
  getSources,
  getTopPages,
  listSites,
} from "./api";
import { getKobbePreferences } from "./preferences";
import type { KobbeSite, KobbeSource, KobbeTopPage, TimeRange } from "./types";
import type { ReactElement } from "react";

export const RANGE_OPTIONS: Array<{ title: string; value: TimeRange }> = [
  { title: "Today", value: "today" },
  { title: "Last 24 Hours", value: "24h" },
  { title: "Last 7 Days", value: "7d" },
  { title: "Last 30 Days", value: "30d" },
  { title: "All Time", value: "all" },
];

function siteDomain(site: KobbeSite): string {
  return site.domain || "No domain";
}

function siteCreatedDate(site: KobbeSite): Date | undefined {
  return site.createdAt > 0 ? new Date(site.createdAt) : undefined;
}

export function siteIcon(site: KobbeSite): Image.ImageLike {
  if (site.domain) {
    return getFavicon(`https://${site.domain}`, { fallback: "extension-icon.png" });
  }
  return "extension-icon.png";
}

/**
 * Kobbe returns sources as referrer origins ("https://google.com") or labels
 * like "Direct / unknown". Extract a hostname when there is one so favicons
 * resolve and titles read cleanly; otherwise fall back to the raw label.
 */
function sourceHostname(source: KobbeSource): string | null {
  const raw = source.source.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const { hostname } = new URL(candidate);
    return hostname.includes(".") ? hostname : null;
  } catch {
    return null;
  }
}

function sourceTitle(source: KobbeSource): string {
  return sourceHostname(source) ?? source.source;
}

function sourceIcon(source: KobbeSource): Image.ImageLike {
  const hostname = sourceHostname(source);
  return hostname ? getFavicon(`https://${hostname}`, { fallback: Icon.Globe }) : Icon.Globe;
}

function useRange(initial?: TimeRange) {
  return useState<TimeRange>(initial ?? getKobbePreferences().defaultRange);
}

function RangeDropdown(props: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <List.Dropdown tooltip="Time Range" value={props.value} onChange={(value) => props.onChange(value as TimeRange)}>
      {RANGE_OPTIONS.map((option) => (
        <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
      ))}
    </List.Dropdown>
  );
}

function topPageAccessories(page: Pick<KobbeTopPage, "visitors" | "views">) {
  return [
    { text: `${formatCompactNumber(page.visitors)} visitors` },
    { text: `${formatCompactNumber(page.views)} views` },
  ];
}

function RetryAction(props: { onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
    </ActionPanel>
  );
}

function TopPageActions(props: { siteId: string; range: TimeRange; path: string; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Path" content={props.path} />
      <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(props.siteId, props.range)} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={props.onRefresh}
      />
    </ActionPanel>
  );
}

export function SiteActions(props: {
  site: KobbeSite;
  range?: TimeRange;
  onRefresh?: () => void;
  hideOverview?: boolean;
}) {
  const preferences = getKobbePreferences();
  const range = props.range ?? preferences.defaultRange;
  const overviewFirst = preferences.primaryAction === "view-overview" && !props.hideOverview;

  const overviewAction = props.hideOverview ? null : (
    <Action.Push
      title="View Overview"
      icon={Icon.BarChart}
      target={<SiteOverviewDetail site={props.site} range={range} />}
    />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {overviewFirst ? overviewAction : null}
        <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(props.site.id, range)} />
        <Action.Push
          title="View Top Pages"
          icon={Icon.Document}
          target={<TopPagesList site={props.site} range={range} />}
        />
        <Action.Push
          title="View Revenue"
          icon={Icon.Coins}
          target={<RevenueDetail site={props.site} range={range} />}
        />
        {overviewFirst ? null : overviewAction}
        <Action.Push title="View Sources" icon={Icon.Globe} target={<SourcesList site={props.site} range={range} />} />
        <Action.Push title="View Setup Health" icon={Icon.Heartbeat} target={<SetupHealthList site={props.site} />} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.onRefresh ? (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
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
      icon={siteIcon(props.site)}
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
  const sites = useCachedPromise(listSites, [], { keepPreviousData: true });

  return (
    <List isLoading={sites.isLoading} searchBarPlaceholder={props.searchBarPlaceholder} navigationTitle={props.title}>
      {sites.error ? (
        <List.EmptyView
          title="Could not load Kobbe sites"
          description={sites.error.message}
          actions={<RetryAction onRetry={sites.revalidate} />}
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
            icon={siteIcon(site)}
            accessories={[...(createdAt ? [{ date: createdAt, tooltip: "Created" }] : [])]}
            actions={props.renderActions(site, sites.revalidate)}
          />
        );
      })}
    </List>
  );
}

export function SiteOverviewDetail(props: { site: KobbeSite; range?: TimeRange }) {
  const [range, setRange] = useRange(props.range);
  const overview = useCachedPromise(getOverview, [props.site.id, range], { keepPreviousData: true });
  const data = overview.data?.overview;

  const kpiActions = <SiteActions site={props.site} range={range} onRefresh={overview.revalidate} hideOverview />;

  return (
    <List
      isLoading={overview.isLoading}
      navigationTitle={`${props.site.name} Overview`}
      searchBarPlaceholder={`Search ${siteDomain(props.site)} overview...`}
      searchBarAccessory={<RangeDropdown value={range} onChange={setRange} />}
    >
      {overview.error ? (
        <List.EmptyView
          title="Could not load overview"
          description={overview.error.message}
          actions={<RetryAction onRetry={overview.revalidate} />}
        />
      ) : null}
      {data ? (
        <>
          <List.Section title="Live">
            <List.Item
              icon={{ source: Icon.Livestream, tintColor: Color.Green }}
              title="Online Now"
              accessories={[{ tag: { value: data.kpis.online, color: Color.Green } }]}
              actions={kpiActions}
            />
          </List.Section>
          <List.Section title={`Traffic · ${data.range}`}>
            <List.Item
              icon={{ source: Icon.Person, tintColor: Color.Blue }}
              title="Visitors"
              accessories={[{ text: data.kpis.visitors }]}
              actions={kpiActions}
            />
            <List.Item
              icon={{ source: Icon.Eye, tintColor: Color.Purple }}
              title="Views"
              accessories={[{ text: data.kpis.views }]}
              actions={kpiActions}
            />
            <List.Item
              icon={{ source: Icon.TwoPeople, tintColor: Color.Orange }}
              title="Visits"
              accessories={[{ text: data.kpis.visits }]}
              actions={kpiActions}
            />
          </List.Section>
          <List.Section title="Engagement">
            <List.Item
              icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
              title="Avg Session"
              accessories={[{ text: data.kpis.sessionTime }]}
              actions={kpiActions}
            />
            <List.Item
              icon={{ source: Icon.PieChart, tintColor: Color.Red }}
              title="Bounce Rate"
              accessories={[{ text: data.kpis.bounceRate }]}
              actions={kpiActions}
            />
          </List.Section>
          <List.Section title="Revenue">
            <List.Item
              icon={{ source: Icon.Coins, tintColor: Color.Green }}
              title="Revenue"
              accessories={[{ text: formatRevenue(data.revenue) }, { text: `${data.revenue.orders} orders` }]}
              actions={kpiActions}
            />
          </List.Section>
          <List.Section title="Top Pages">
            {data.topPages.length ? (
              data.topPages
                .slice(0, 5)
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
          <List.Section title="Top Sources">
            {data.sources.length ? (
              data.sources
                .slice(0, 5)
                .map((source) => (
                  <List.Item
                    key={source.source}
                    icon={sourceIcon(source)}
                    title={sourceTitle(source)}
                    accessories={topPageAccessories(source)}
                    actions={kpiActions}
                  />
                ))
            ) : (
              <List.Item icon={Icon.Globe} title="No source data" subtitle="No referrers in this range" />
            )}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

export function TopPagesList(props: { site: KobbeSite; range?: TimeRange }) {
  const [range, setRange] = useRange(props.range);
  const pages = useCachedPromise(getTopPages, [props.site.id, range], { keepPreviousData: true });

  return (
    <List
      isLoading={pages.isLoading}
      navigationTitle={`${props.site.name} Top Pages`}
      searchBarPlaceholder="Search pages..."
      searchBarAccessory={<RangeDropdown value={range} onChange={setRange} />}
    >
      {pages.error ? (
        <List.EmptyView
          title="Could not load top pages"
          description={pages.error.message}
          actions={<RetryAction onRetry={pages.revalidate} />}
        />
      ) : null}
      {pages.data?.pages.length === 0 ? (
        <List.EmptyView
          title="No page data"
          description="Kobbe has not recorded pageviews for this site in the selected range."
        />
      ) : null}
      <List.Section title={pages.data ? `${siteDomain(props.site)} · ${pages.data.range}` : undefined}>
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
      </List.Section>
    </List>
  );
}

export function SourcesList(props: { site: KobbeSite; range?: TimeRange }) {
  const [range, setRange] = useRange(props.range);
  const sources = useCachedPromise(getSources, [props.site.id, range], { keepPreviousData: true });

  return (
    <List
      isLoading={sources.isLoading}
      navigationTitle={`${props.site.name} Sources`}
      searchBarPlaceholder="Search sources..."
      searchBarAccessory={<RangeDropdown value={range} onChange={setRange} />}
    >
      {sources.error ? (
        <List.EmptyView
          title="Could not load sources"
          description={sources.error.message}
          actions={<RetryAction onRetry={sources.revalidate} />}
        />
      ) : null}
      {sources.data?.sources.length === 0 ? (
        <List.EmptyView
          title="No source data"
          description="Kobbe has not recorded referrers for this site in the selected range."
        />
      ) : null}
      <List.Section title={sources.data ? `${siteDomain(props.site)} · ${sources.data.range}` : undefined}>
        {sources.data?.sources.map((source) => (
          <List.Item
            key={source.source}
            title={sourceTitle(source)}
            icon={sourceIcon(source)}
            accessories={topPageAccessories(source)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Source" content={source.source} />
                <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(props.site.id, range)} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={sources.revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export function SetupHealthList(props: { site: KobbeSite }) {
  const health = useCachedPromise(getSetupHealth, [props.site.id], { keepPreviousData: true });
  const data = health.data?.health;

  const statusIcon = (ok: boolean) =>
    ok ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.XMarkCircle, tintColor: Color.Red };

  return (
    <List isLoading={health.isLoading} navigationTitle={`${props.site.name} Setup Health`}>
      {health.error ? (
        <List.EmptyView
          title="Could not load setup health"
          description={health.error.message}
          actions={<RetryAction onRetry={health.revalidate} />}
        />
      ) : null}
      {data ? (
        <>
          <List.Section title="Tracker">
            <List.Item
              icon={statusIcon(data.trackerInstalled)}
              title="Tracker Installed"
              subtitle={data.trackerInstalled ? "Kobbe is receiving pageviews" : "No pageviews received yet"}
              accessories={[{ text: `${formatCompactNumber(data.pageviewsAllTime)} pageviews all time` }]}
              actions={<SiteActions site={props.site} onRefresh={health.revalidate} />}
            />
          </List.Section>
          {data.revenueConfigured != null ? (
            <List.Section title="Revenue">
              <List.Item
                icon={statusIcon(data.revenueConfigured)}
                title="Revenue Webhook"
                subtitle={data.revenueConfigured ? "At least one provider is configured" : "No provider configured"}
                accessories={[{ text: `${formatCompactNumber(data.revenueOrdersAllTime ?? 0)} orders all time` }]}
                actions={<SiteActions site={props.site} onRefresh={health.revalidate} />}
              />
              {data.revenueSources?.map((source) => (
                <List.Item
                  key={source.provider}
                  icon={statusIcon(source.enabled && source.webhookSecretConfigured)}
                  title={source.provider}
                  subtitle={
                    source.enabled
                      ? source.webhookSecretConfigured
                        ? "Enabled"
                        : "Enabled, webhook secret missing"
                      : "Disabled"
                  }
                  actions={<SiteActions site={props.site} onRefresh={health.revalidate} />}
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}

export function RevenueDetail(props: { site: KobbeSite; range?: TimeRange }) {
  const [range, setRange] = useRange(props.range);
  const revenue = useCachedPromise(getRevenueWithOverview, [props.site.id, range], { keepPreviousData: true });
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
            `- **${sourceTitle(source)}** · ${formatCompactNumber(
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
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(props.site.id, range)} />
            <ActionPanel.Submenu title="Change Range" icon={Icon.Calendar}>
              {RANGE_OPTIONS.map((option) => (
                <Action key={option.value} title={option.title} onAction={() => setRange(option.value)} />
              ))}
            </ActionPanel.Submenu>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revenue.revalidate}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Site ID" content={props.site.id} />
            <Action.CopyToClipboard title="Copy Domain" content={props.site.domain ?? ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
