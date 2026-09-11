import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DailyStats,
  formatCost,
  formatTokens,
  generateProjectTable,
  getAllTimeStats,
  getDailyStats,
  getMonthStats,
  getTodayStats,
  getWeekStats,
  TopSessionSummary,
  UsageStats,
} from "./lib/usage-stats";
import { renderBarChartToFile } from "./lib/svg-chart";
import { pathToFileURL } from "url";
import { loadClaudeSubscriptionUsage } from "./lib/claude-subscription";
import {
  formatSubscriptionTimestamp,
  type SubscriptionUsageResult,
} from "./lib/subscription-usage";

type RangeKey = "today" | "week" | "month" | "all";

const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

export default function UsageDashboard() {
  const [statsByRange, setStatsByRange] = useState<
    Partial<Record<RangeKey, UsageStats>>
  >({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [daily, setDaily] = useState<DailyStats[]>([]);
  // Tracks which range `daily` was fetched for. Without this, switching range
  // briefly aggregates stale data with the new range (e.g. 7 daily points
  // bucketed as "monthly"), producing a mismatched chart for ~100ms before
  // the new fetch lands. By aggregating against `dailyRange`, the chart
  // keeps showing the previous range's correct view until the new data is
  // ready, then swaps atomically.
  const [dailyRange, setDailyRange] = useState<RangeKey>("today");
  const [range, setRange] = useState<RangeKey>("today");
  const [subscription, setSubscription] = useState<SubscriptionUsageResult>();
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const subscriptionSequence = useRef(0);
  const subscriptionAbort = useRef<AbortController>();

  const refreshSubscription = useCallback(async (forceRefresh = false) => {
    const sequence = ++subscriptionSequence.current;
    subscriptionAbort.current?.abort();
    const controller = new AbortController();
    subscriptionAbort.current = controller;
    setSubscriptionLoading(true);
    try {
      const result = await loadClaudeSubscriptionUsage({
        forceRefresh,
        signal: controller.signal,
      });
      if (
        sequence !== subscriptionSequence.current ||
        controller.signal.aborted
      ) {
        return;
      }
      setSubscription(result);
      if (forceRefresh) {
        await showToast({
          style:
            result.error && !result.usage
              ? Toast.Style.Failure
              : result.stale
                ? Toast.Style.Failure
                : Toast.Style.Success,
          title: result.stale
            ? "Subscription Usage Is Stale"
            : result.error && !result.usage
              ? "Subscription Usage Refresh Failed"
              : "Subscription Usage Refreshed",
          message: result.error,
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (sequence === subscriptionSequence.current && forceRefresh) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Subscription Usage Refresh Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (sequence === subscriptionSequence.current) {
        setSubscriptionLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshSubscription(false);
    return () => subscriptionAbort.current?.abort();
  }, [refreshSubscription]);

  // Fetch a daily series sized for the selected range. Cancellation token
  // protects against stale responses from rapid range switches.
  useEffect(() => {
    let cancelled = false;
    getDailyStats(daysForRange(range)).then((data) => {
      if (cancelled) return;
      setDaily(data);
      setDailyRange(range);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    setStatsLoading(true);
    Promise.all([
      getTodayStats().then((s) => ["today" as const, s] as const),
      getWeekStats().then((s) => ["week" as const, s] as const),
      getMonthStats().then((s) => ["month" as const, s] as const),
      getAllTimeStats().then((s) => ["all" as const, s] as const),
    ])
      .then((entries) => {
        const next: Partial<Record<RangeKey, UsageStats>> = {};
        for (const [k, v] of entries) next[k] = v;
        setStatsByRange(next);
      })
      .finally(() => setStatsLoading(false));
  }, []);

  const chart = useMemo(() => {
    if (daily.length === 0) return null;
    // Aggregate against dailyRange (the range `daily` was fetched for), not
    // the current `range`. During a range switch the chart keeps showing the
    // previous range's correct view; when the new fetch lands, dailyRange and
    // range realign and the chart updates cleanly.
    const { points, header } = aggregateForChart(daily, dailyRange);
    if (points.length === 0) return null;
    const path = renderBarChartToFile(points, {
      valueFormatter: (n) => (n >= 0.01 ? `$${n.toFixed(2)}` : ""),
    });
    const total = points.reduce((s, p) => s + p.value, 0);
    return { path, header, total };
  }, [daily, dailyRange]);

  const stats = statsByRange[range];

  const markdown = buildMarkdown({
    range,
    stats,
    chart,
    statsLoading,
    subscription,
    subscriptionLoading,
  });

  return (
    <Detail
      isLoading={statsLoading}
      markdown={markdown}
      navigationTitle={`Usage: ${RANGE_LABEL[range]}`}
      metadata={<Sidebar stats={stats} subscription={subscription} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Time Range">
            <Action
              title="Today"
              icon={range === "today" ? Icon.CheckCircle : Icon.Calendar}
              onAction={() => setRange("today")}
            />
            <Action
              title="This Week"
              icon={range === "week" ? Icon.CheckCircle : Icon.Calendar}
              onAction={() => setRange("week")}
            />
            <Action
              title="This Month"
              icon={range === "month" ? Icon.CheckCircle : Icon.Calendar}
              onAction={() => setRange("month")}
            />
            <Action
              title="All Time"
              icon={range === "all" ? Icon.CheckCircle : Icon.Calendar}
              onAction={() => setRange("all")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Subscription Usage">
            <Action
              title="Refresh Subscription Usage"
              icon={Icon.ArrowClockwise}
              onAction={() => refreshSubscription(true)}
            />
            <Action.OpenInBrowser
              title="Open Claude Usage Settings"
              url="https://claude.ai/settings/usage"
            />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Sidebar({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription: SubscriptionUsageResult | undefined;
}) {
  if (!stats) {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Loading..." text="" />
      </Detail.Metadata>
    );
  }

  const topProjects = Object.entries(stats.sessionsByProject)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, 5);

  return (
    <Detail.Metadata>
      {subscription?.usage?.fiveHour ? (
        <Detail.Metadata.Label
          title="Five-Hour Usage"
          text={formatWindowSummary(subscription.usage.fiveHour.usedPercent)}
          icon={Icon.Clock}
        />
      ) : null}
      {subscription?.usage?.weekly ? (
        <Detail.Metadata.Label
          title="Weekly Usage"
          text={formatWindowSummary(subscription.usage.weekly.usedPercent)}
          icon={Icon.Gauge}
        />
      ) : null}
      {subscription?.forecast.available ? (
        <Detail.Metadata.Label
          title="Weekly Forecast"
          text={formatForecastSummary(subscription)}
          icon={Icon.LineChart}
        />
      ) : null}
      {subscription?.usage ? (
        <Detail.Metadata.Label
          title="Subscription Data"
          text={`${subscription.stale ? "Stale, " : "Updated "}${formatAge(subscription.usage.fetchedAt)}`}
          icon={subscription.stale ? Icon.Warning : Icon.CheckCircle}
        />
      ) : subscription?.error ? (
        <Detail.Metadata.Label
          title="Subscription Limits"
          text="Unavailable"
          icon={Icon.Warning}
        />
      ) : null}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="Total Cost"
        text={formatCost(stats.totalCost)}
        icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
      />
      <Detail.Metadata.Label
        title="Sessions"
        text={stats.totalSessions.toString()}
        icon={Icon.Message}
      />
      <Detail.Metadata.Label
        title="Avg / Session"
        text={formatCost(
          stats.totalSessions > 0 ? stats.totalCost / stats.totalSessions : 0,
        )}
      />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="Input Tokens"
        text={formatTokens(stats.totalInputTokens)}
      />
      <Detail.Metadata.Label
        title="Output Tokens"
        text={formatTokens(stats.totalOutputTokens)}
      />
      <Detail.Metadata.Label
        title="Cache Read"
        text={formatTokens(stats.totalCacheReadTokens)}
      />
      <Detail.Metadata.Label
        title="Cache Write"
        text={formatTokens(stats.totalCacheCreationTokens)}
      />

      {topProjects.length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Top Projects">
            {topProjects.map(([project, data]) => (
              <Detail.Metadata.TagList.Item
                key={project}
                text={`${project} (${formatCost(data.cost)})`}
                color={Color.Blue}
              />
            ))}
          </Detail.Metadata.TagList>
        </>
      )}

      {stats.topSessions.length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Most Expensive Session"
            text={`${formatCost(stats.topSessions[0].cost)} in ${stats.topSessions[0].projectName}`}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          />
        </>
      )}
    </Detail.Metadata>
  );
}

// How many days of underlying daily data to fetch per range. The chart later
// aggregates into the right bin size so the X axis stays readable.
function daysForRange(range: RangeKey): number {
  switch (range) {
    case "today":
    case "week":
      return 7;
    case "month":
      return 30;
    case "all":
      return 365;
  }
}

// Bucket daily data into chart points sized for the selected range:
//   today/week => one bar per day
//   month      => one bar per 7-day chunk (4-5 weekly bars)
//   all        => one bar per calendar month (up to 12 most recent)
// Returns chart points and a header label that describes the binning.
function aggregateForChart(
  daily: DailyStats[],
  range: RangeKey,
): { points: { label: string; value: number }[]; header: string } {
  if (range === "month") {
    const points: { label: string; value: number }[] = [];
    for (let i = 0; i < daily.length; i += 7) {
      const chunk = daily.slice(i, i + 7);
      const total = chunk.reduce((s, d) => s + d.cost, 0);
      const start = chunk[0].date.slice(5);
      const end = chunk[chunk.length - 1].date.slice(5);
      points.push({
        label: chunk.length > 1 ? `${start} to ${end}` : start,
        value: total,
      });
    }
    return { points, header: "Weekly Cost (Last 30 Days)" };
  }

  if (range === "all") {
    const monthMap = new Map<string, number>();
    for (const d of daily) {
      const monthKey = d.date.slice(0, 7); // YYYY-MM
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + d.cost);
    }
    const sorted = Array.from(monthMap.entries()).sort();
    const recent = sorted.slice(-12);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const points = recent.map(([key, value]) => {
      const [year, month] = key.split("-");
      return {
        label: `${monthNames[parseInt(month, 10) - 1]} ${year.slice(2)}`,
        value,
      };
    });
    const header =
      recent.length > 0
        ? `Monthly Cost (Last ${recent.length} Months)`
        : "Monthly Cost";
    return { points, header };
  }

  // today / week: one bar per day, MM-DD label.
  return {
    points: daily.map((d) => ({ label: d.date.slice(5), value: d.cost })),
    header: `Daily Cost (Last ${daily.length} Days)`,
  };
}

function buildMarkdown(args: {
  range: RangeKey;
  stats: UsageStats | undefined;
  chart: { path: string; header: string; total: number } | null;
  statsLoading: boolean;
  subscription: SubscriptionUsageResult | undefined;
  subscriptionLoading: boolean;
}): string {
  const {
    range,
    stats,
    chart,
    statsLoading,
    subscription,
    subscriptionLoading,
  } = args;

  let md = "# Claude Code Usage Dashboard\n\n";
  md += buildSubscriptionMarkdown(subscription, subscriptionLoading);
  md += `## Local Token Cost Estimates: ${RANGE_LABEL[range]}\n\n`;

  // Range-adapted chart. The aggregator picks the right granularity (daily,
  // weekly, or monthly) so the X-axis stays readable regardless of window.
  if (chart) {
    md += `## ${chart.header}\n\n`;
    md += `![${chart.header}](${pathToFileURL(chart.path).href}?raycast-width=820)\n\n`;
    md += `_Total: **${formatCost(chart.total)}**_\n\n`;
  }

  if (!stats) {
    md += statsLoading
      ? `_Loading ${RANGE_LABEL[range]}..._\n`
      : `_No data for ${RANGE_LABEL[range]}._\n`;
    return md;
  }

  // Project breakdown for the selected range.
  const projectKeys = Object.keys(stats.sessionsByProject);
  if (projectKeys.length > 0) {
    md += `## Cost by Project (${RANGE_LABEL[range]})\n\n`;
    md += generateProjectTable(stats.sessionsByProject);
    md += `\n`;
  }

  // Top sessions for the selected range.
  if (stats.topSessions.length > 0) {
    md += `## Top Sessions (${RANGE_LABEL[range]})\n\n`;
    md += `| # | Project | First Message | Cost |\n`;
    md += `|--:|---------|---------------|-----:|\n`;
    stats.topSessions.slice(0, 10).forEach((s, i) => {
      const preview = sessionPreview(s);
      md += `| ${i + 1} | ${escapeMd(s.projectName)} | ${escapeMd(preview)} | ${formatCost(s.cost)} |\n`;
    });
    md += `\n`;
  }

  md += `\n---\n\n`;
  md += `_Tip: open the Action Panel to switch range. Sidebar totals update with the range._\n`;

  return md;
}

function buildSubscriptionMarkdown(
  result: SubscriptionUsageResult | undefined,
  isLoading: boolean,
): string {
  let markdown = "## Subscription Limits\n\n";
  if (!result?.usage) {
    if (isLoading) return `${markdown}_Loading Subscription Usage..._\n\n`;
    return `${markdown}_${result?.error ?? "Subscription Usage Is Unavailable"}_\n\n`;
  }

  if (result.stale) {
    markdown += `> Stale Data from ${formatAge(result.usage.fetchedAt)}. ${result.error ?? "The Latest Refresh Failed."}\n\n`;
  } else {
    markdown += `_Last Successful Refresh: ${formatAge(result.usage.fetchedAt)}_\n\n`;
  }
  markdown += "| Window | Used | Remaining | Resets |\n";
  markdown += "|--------|-----:|----------:|--------|\n";
  for (const [label, window] of [
    ["Five-Hour", result.usage.fiveHour],
    ["Weekly", result.usage.weekly],
    ["Weekly Opus", result.usage.weeklyOpus],
    ["Weekly Sonnet", result.usage.weeklySonnet],
  ] as const) {
    if (!window) continue;
    markdown += `| ${label} | ${formatPercent(window.usedPercent)} | ${formatPercent(100 - window.usedPercent)} | ${formatSubscriptionTimestamp(window.resetsAt)} |\n`;
  }
  for (const scoped of result.usage.scopedWeekly) {
    if (/opus|sonnet/i.test(scoped.label)) continue;
    markdown += `| Weekly ${escapeMd(scoped.label)} | ${formatPercent(scoped.window.usedPercent)} | ${formatPercent(100 - scoped.window.usedPercent)} | ${formatSubscriptionTimestamp(scoped.window.resetsAt)} |\n`;
  }
  markdown += "\n";

  if (result.forecast.available) {
    markdown += "### Weekly Forecast\n\n";
    markdown += `- Projected At Reset: ${formatPercent(result.forecast.projectedUsedPercentAtReset ?? 0)}\n`;
    markdown += `- Predicted Exhaustion: ${result.forecast.exhaustsAt ? formatSubscriptionTimestamp(result.forecast.exhaustsAt) : "Not Before This Reset"}\n`;
    markdown += `- Confidence: ${result.forecast.confidence}\n`;
    markdown += `- Method: ${result.forecast.method}\n`;
    markdown += `- Data: ${result.forecast.sampleCount} Snapshots Across ${result.forecast.observedDays} Local Days\n\n`;
  } else {
    markdown += "### Weekly Forecast\n\n";
    markdown += `_Unavailable: ${result.forecast.reason ?? "More Usage History Is Required"}. ${result.forecast.sampleCount} Snapshots Recorded._\n\n`;
  }

  if (result.usage.warnings.length > 0) {
    markdown += `_${result.usage.warnings.join(". ")}._\n\n`;
  }
  return markdown;
}

function formatPercent(value: number): string {
  const bounded = Math.min(100, Math.max(0, value));
  return `${bounded.toFixed(bounded % 1 === 0 ? 0 : 1)}%`;
}

function formatWindowSummary(usedPercent: number): string {
  return `${formatPercent(usedPercent)} Used, ${formatPercent(100 - usedPercent)} Remaining`;
}

function formatForecastSummary(result: SubscriptionUsageResult): string {
  const forecast = result.forecast;
  if (!forecast.available) return "Collecting History";
  if (forecast.exhaustsAt) {
    return `Exhausts ${formatSubscriptionTimestamp(forecast.exhaustsAt)}`;
  }
  return `${formatPercent(forecast.projectedUsedPercentAtReset ?? 0)} At Reset`;
}

function formatAge(timestamp: string): string {
  const ageMs = Math.max(0, Date.now() - Date.parse(timestamp));
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "Less Than a Minute Ago";
  if (minutes < 60) return `${minutes} Minute${minutes === 1 ? "" : "s"} Ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Hour${hours === 1 ? "" : "s"} Ago`;
  const days = Math.floor(hours / 24);
  return `${days} Day${days === 1 ? "" : "s"} Ago`;
}

function sessionPreview(s: TopSessionSummary): string {
  const text = s.firstMessage || "(no message)";
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

// Markdown table cells get broken by raw `|` and `\n`. Replace newlines and
// escape pipes so the table still renders.
function escapeMd(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
