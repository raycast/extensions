import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useMemo } from "react";
import { AuthGate } from "@/components/auth-gate";
import { LinkAnalytics } from "@/components/link-analytics";
import { LinkDetailSidebar } from "@/components/link-detail";
import { useLinks } from "@/hooks/use-links";
import { useStats } from "@/hooks/use-stats";
import { formatClicks } from "@/lib/format";
import { countryDisplay } from "@/lib/emoji-flag";
import { barChart, lineChart, toMarkdownImage } from "@/lib/svg-chart";
import {
  getBreakdown,
  getTimeSeries,
  summaryOf,
  type BreakdownRow,
  type DimensionName,
} from "@/schemas/stats";
import type { UrlListItem } from "@/schemas/url";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function Dashboard() {
  return (
    <AuthGate>
      <DashboardView />
    </AuthGate>
  );
}

const WINDOW_DAYS = 30;

function DashboardView() {
  // Options are memoized so their identity is stable across renders — otherwise
  // useCachedPromise re-fires on every render and hammers the API.
  // One stats call covers both the totals + dimension breakdowns + the time
  // series for the sparkline — all aligned to the same window.
  const statsOptions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - WINDOW_DAYS * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return {
      scope: "all" as const,
      groupBy: [
        "time",
        "country",
        "browser",
        "os",
        "referrer",
        "short_code",
      ] as const,
      startDate: start,
      endDate: today,
    };
  }, []);
  const linkOptions = useMemo(
    () => ({
      sortBy: "total_clicks" as const,
      sortOrder: "desc" as const,
      pageSize: 100,
    }),
    [],
  );

  const { stats, isLoading: statsLoading } = useStats(statsOptions);
  const { links, isLoading: linksLoading } = useLinks(linkOptions);

  const summary = summaryOf(stats);
  const totalClicks = summary.total_clicks;
  const uniqueClicks = summary.unique_clicks;

  const clicksSeries = getTimeSeries(stats, "clicks");
  const uniqueSeries = getTimeSeries(stats, "unique_clicks");
  const trend = clicksSeries.map((p) => p.value);
  const last7 = trend.slice(-7).reduce((a, b) => a + b, 0);
  const prior7 = trend.slice(-14, -7).reduce((a, b) => a + b, 0);
  const weekly = computeDelta(last7, prior7);

  const topCountries = getBreakdown(stats, "clicks", "country");
  const topBrowsers = getBreakdown(stats, "clicks", "browser");
  const topOs = getBreakdown(stats, "clicks", "os");
  const topReferrers = getBreakdown(stats, "clicks", "referrer");
  const topLinkRows = getBreakdown(stats, "clicks", "short_code");

  const linkByAlias = useMemo(() => {
    const map = new Map<string, UrlListItem>();
    for (const link of links) map.set(link.alias ?? link.id, link);
    return map;
  }, [links]);

  const topLinks = topLinkRows
    .slice(0, 10)
    .map((row) => ({
      link: linkByAlias.get(row.key),
      alias: row.key,
      windowClicks: row.value,
    }))
    .filter(
      (
        row,
      ): row is { link: UrlListItem; alias: string; windowClicks: number } =>
        !!row.link,
    );

  const isLoading = statsLoading || linksLoading;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search your dashboard"
      navigationTitle="spoo.me Dashboard"
    >
      <List.Section title={`Last ${WINDOW_DAYS} days`}>
        <List.Item
          id="total-clicks"
          icon={{ source: Icon.Eye, tintColor: Color.Blue }}
          title="Clicks"
          accessories={[
            { tag: { value: formatClicks(totalClicks), color: Color.Blue } },
          ]}
          detail={
            <OverviewDetail
              heading={formatClicks(totalClicks)}
              caption={`Clicks in the last ${WINDOW_DAYS} days`}
              points={toChartPoints(clicksSeries)}
              chartTitle=""
              accent="#3B82F6"
            />
          }
        />
        <List.Item
          id="unique-visitors"
          icon={{ source: Icon.Person, tintColor: Color.Green }}
          title="Unique visitors"
          accessories={[
            { tag: { value: formatClicks(uniqueClicks), color: Color.Green } },
          ]}
          detail={
            <OverviewDetail
              heading={formatClicks(uniqueClicks)}
              caption={`Distinct visitors in the last ${WINDOW_DAYS} days`}
              points={toChartPoints(uniqueSeries)}
              chartTitle=""
              accent="#10B981"
            />
          }
        />
        <List.Item
          id="weekly"
          icon={weeklyIcon(weekly.direction)}
          title="This week"
          accessories={[
            {
              tag: {
                value: `${formatClicks(last7)} ${weekly.arrow}`.trim(),
                color: weekly.color,
              },
            },
          ]}
          detail={
            <OverviewDetail
              heading={formatClicks(last7)}
              caption={weekly.description}
              points={toChartPoints(clicksSeries).slice(-14)}
              chartTitle=""
              accent={weekly.direction === "down" ? "#EF4444" : "#10B981"}
            />
          }
        />
      </List.Section>

      <List.Section title="Insights">
        <InsightItem
          id="insight-countries"
          title="Top countries"
          icon={{ source: Icon.Globe, tintColor: Color.Orange }}
          rows={topCountries}
          emptyMessage="No geography data yet"
          dimension="country"
          accent="#F97316"
        />
        <InsightItem
          id="insight-browsers"
          title="Top browsers"
          icon={{ source: Icon.Window, tintColor: Color.Blue }}
          rows={topBrowsers}
          emptyMessage="No browser data yet"
          accent="#3B82F6"
        />
        <InsightItem
          id="insight-os"
          title="Top operating systems"
          icon={{ source: Icon.Desktop, tintColor: Color.Magenta }}
          rows={topOs}
          emptyMessage="No OS data yet"
          accent="#D946EF"
        />
        <InsightItem
          id="insight-referrers"
          title="Top referrers"
          icon={{ source: Icon.ArrowRight, tintColor: Color.Yellow }}
          rows={topReferrers}
          emptyMessage="No referrer data yet"
          fallback="Direct"
          accent="#EAB308"
        />
      </List.Section>

      <List.Section
        title="Top performing links"
        subtitle={`Last ${WINDOW_DAYS} days`}
      >
        {topLinks.map((row, index) => (
          <TopLinkItem
            key={row.link.id}
            link={row.link}
            rank={index + 1}
            windowClicks={row.windowClicks}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface OverviewDetailProps {
  heading: string;
  caption: string;
  points: Array<{ label: string; value: number }>;
  chartTitle: string;
  accent: string;
}

function OverviewDetail({
  heading,
  caption,
  points,
  chartTitle,
  accent,
}: OverviewDetailProps) {
  const lines = [`# ${heading}`, "", caption];
  if (points.length > 1) {
    const svg = lineChart(points, {
      title: chartTitle || undefined,
      accent,
      yFormatter: (v) => formatClicks(Math.round(v)),
    });
    lines.push("", toMarkdownImage(svg, "Daily trend"));
  }
  return <List.Item.Detail markdown={lines.join("\n")} />;
}

interface InsightItemProps {
  id: string;
  title: string;
  icon: { source: Icon; tintColor: Color };
  rows: BreakdownRow[];
  emptyMessage: string;
  accent: string;
  dimension?: DimensionName;
  fallback?: string;
}

function InsightItem({
  id,
  title,
  icon,
  rows,
  emptyMessage,
  accent,
  dimension,
  fallback,
}: InsightItemProps) {
  const top = rows[0];
  const accessory = top ? decorateKey(top.key, dimension, fallback) : "—";
  return (
    <List.Item
      id={id}
      icon={icon}
      title={title}
      accessories={[{ tag: accessory }]}
      detail={
        <List.Item.Detail
          markdown={renderBreakdown(
            title,
            rows,
            emptyMessage,
            accent,
            dimension,
            fallback,
          )}
        />
      }
    />
  );
}

function TopLinkItem({
  link,
  rank,
  windowClicks,
}: {
  link: UrlListItem;
  rank: number;
  windowClicks: number;
}) {
  const { push } = useNavigation();
  const alias = link.alias ?? link.id;
  return (
    <List.Item
      id={`link-${link.id}`}
      title={`${rank}. ${alias}`}
      icon={rankIcon(rank)}
      accessories={[
        { text: formatClicks(windowClicks), icon: Icon.Eye },
        ...(link.last_click ? [{ date: new Date(link.last_click) }] : []),
      ]}
      detail={<LinkDetailSidebar link={link} />}
      actions={
        <ActionPanel>
          <Action
            title="View Analytics"
            icon={Icon.BarChart}
            onAction={() => push(<LinkAnalytics link={link} />)}
          />
          <Action.CopyToClipboard
            title="Copy Short URL"
            content={link.short_url}
          />
          <Action.OpenInBrowser title="Open Short URL" url={link.short_url} />
        </ActionPanel>
      }
    />
  );
}

function renderBreakdown(
  title: string,
  rows: BreakdownRow[],
  emptyMessage: string,
  accent: string,
  dimension?: DimensionName,
  fallback?: string,
): string {
  const heading = `# ${title}\n\nLast ${WINDOW_DAYS} days`;
  if (rows.length === 0) return `${heading}\n\n_${emptyMessage}_`;

  const entries = rows.map((row) => ({
    label: decorateKey(row.key, dimension, fallback),
    value: row.value,
  }));
  const svg = barChart(entries, {
    accent,
    maxBars: 8,
    valueFormatter: (v) => formatClicks(v),
  });
  return `${heading}\n\n${toMarkdownImage(svg, title)}`;
}

function toChartPoints(series: Array<{ time: string; value: number }>) {
  return series.map((p) => ({ label: shortDate(p.time), value: p.value }));
}

function shortDate(isoDate: string): string {
  // "2026-04-21" or "2026-04-21T00:00:00Z" → "Apr 21"
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate.slice(5, 10);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function decorateKey(
  key: string,
  dimension?: DimensionName,
  fallback?: string,
): string {
  if (dimension === "country") {
    const { flag, label } = countryDisplay(key);
    return `${flag} ${label}`;
  }
  return key || fallback || "Unknown";
}

function weeklyIcon(direction: "up" | "down" | "flat") {
  if (direction === "up")
    return { source: Icon.ArrowUp, tintColor: Color.Green };
  if (direction === "down")
    return { source: Icon.ArrowDown, tintColor: Color.Red };
  return { source: Icon.Minus, tintColor: Color.SecondaryText };
}

function rankIcon(rank: number) {
  if (rank === 1) return { source: Icon.Trophy, tintColor: Color.Yellow };
  if (rank === 2)
    return { source: Icon.Trophy, tintColor: Color.SecondaryText };
  if (rank === 3) return { source: Icon.Trophy, tintColor: Color.Orange };
  return { source: Icon.Dot, tintColor: Color.SecondaryText };
}

function computeDelta(current: number, previous: number) {
  if (!previous && !current) {
    return {
      direction: "flat" as const,
      arrow: "",
      color: Color.SecondaryText,
      description: "No activity in the last 14 days.",
    };
  }
  if (!previous) {
    return {
      direction: "up" as const,
      arrow: "▲",
      color: Color.Green,
      description: `${formatClicks(current)} clicks this week · first week of data.`,
    };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) {
    return {
      direction: "flat" as const,
      arrow: "→",
      color: Color.SecondaryText,
      description: `Flat week over week (${formatClicks(previous)} last week).`,
    };
  }
  if (pct > 0) {
    return {
      direction: "up" as const,
      arrow: `▲ ${pct.toFixed(0)}%`,
      color: Color.Green,
      description: `Up ${pct.toFixed(0)}% vs. previous week (${formatClicks(previous)}).`,
    };
  }
  return {
    direction: "down" as const,
    arrow: `▼ ${Math.abs(pct).toFixed(0)}%`,
    color: Color.Red,
    description: `Down ${Math.abs(pct).toFixed(0)}% vs. previous week (${formatClicks(previous)}).`,
  };
}
