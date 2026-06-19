import {
  List,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange, METRIC_LABELS, MetricName } from "./lib/types";
import {
  formatMetricValue,
  lastNDaysEpoch,
  sparkline,
  todayDateKey,
  latestWithField,
  relativeDateLabel,
} from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage, Insight } from "./lib/insights";
import { metricIcon } from "./lib/icons";
import { lineChart, colorToHex } from "./lib/charts";
import { ListStatus } from "./lib/status-view";

// Sleep metrics that should source from the most recent entry with data,
// not blindly from today's entry (which may be empty before morning sync).
const SLEEP_METRICS = new Set<MetricName>([
  "sleep_score",
  "total_sleep",
  "rem_sleep",
  "deep_sleep",
  "light_sleep",
  "sleep_efficiency",
]);

function trendLine(
  metric: MetricName,
  value: number | undefined,
  series: Array<number | undefined>,
): string {
  const delta = deltaVsAverage(value, series, series.length - 1);
  if (!delta) return "";
  const { delta: d, pct, avg } = delta;
  if (Math.abs(pct) <= 1) return "";

  const bigMove = Math.abs(pct) > 5;
  const up = d > 0;
  const arrow = up ? (bigMove ? "⏫" : "⬆️") : bigMove ? "⏬" : "⬇️";
  const sign = d > 0 ? "+" : "";
  const deltaStr = `${sign}${Number.isInteger(d) ? d : d.toFixed(1)}`;
  const avgStr = formatMetricValue(metric, avg);

  return `${arrow} **${deltaStr}** vs 7-day average (${avgStr})`;
}

function detailMarkdown(
  metric: MetricName,
  value: number | undefined,
  series: Array<number | undefined>,
  dates: Array<string | undefined>,
  insight: Insight,
): string {
  const heading = formatMetricValue(metric, value);
  const lines: string[] = [];

  lines.push(`# ${heading}`);
  lines.push(`## ${METRIC_LABELS[metric]}`);
  lines.push("");

  if (insight.status !== "neutral") {
    const statusLine = insight.label
      ? `**${insight.label}** — ${insight.context}`
      : insight.context;
    lines.push(statusLine);
  }

  if (insight.recommendation) {
    lines.push("");
    lines.push(`**Recommend:** ${insight.recommendation}`);
  }

  const trend = trendLine(metric, value, series);
  if (trend) {
    lines.push("");
    lines.push(trend);
  }

  // SVG line chart — only when ≥3 valid data points
  const validCount = series.filter((v) => v != null).length;
  if (validCount >= 3) {
    const hexColor = colorToHex(insight.color);
    const shortLabels = dates.map((d) => {
      if (!d) return "";
      const date = new Date(d + "T12:00:00");
      return date.toLocaleDateString("en-US", { weekday: "short" });
    });
    const chart = lineChart(series, { color: hexColor, labels: shortLabels });
    if (chart) {
      lines.push("");
      lines.push(chart);
    }
  } else {
    const spark = sparkline(series);
    if (spark) {
      lines.push("");
      lines.push("```");
      lines.push(spark);
      lines.push("```");
    }
  }

  return lines.join("\n");
}

export default function Today() {
  const dateKey = todayDateKey();
  const range = useMemo(() => lastNDaysEpoch(7), [dateKey]);
  const fetcher = useCallback(() => getRange(range.start, range.end), [range]);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetricsRange>(fetcher);

  const refresh = useCallback(async () => {
    clearRange(range.start, range.end);
    await reload();
  }, [range, reload]);

  // Must be above every early return (Rules of Hooks).
  const sorted = useMemo(
    () =>
      data
        ? [...data].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        : [],
    [data],
  );

  if (missingToken) {
    return <ListStatus variant="missing-token" />;
  }
  // For non-sleep metrics: use the most-recent (today's) entry.
  // For sleep metrics: use the most recent entry that actually has the field
  // (yesterday's entry for early-morning queries before the Ring has synced).
  const todayData = sorted[sorted.length - 1] ?? null;

  const metrics = Object.keys(METRIC_LABELS) as MetricName[];
  // Show a metric if either today's entry has it OR (for sleep metrics) the
  // most recent matching entry has it.
  const availableMetrics = todayData
    ? metrics.filter((m) => {
        if (SLEEP_METRICS.has(m)) {
          return latestWithField(sorted, m)?.[m] != null;
        }
        return todayData[m] != null;
      })
    : [];

  return (
    <List
      isLoading={loading}
      isShowingDetail={!loading && !!data}
      navigationTitle="Today's Health"
    >
      {error && (
        <ListStatus
          variant="refresh-failed"
          itemTitle={error.message.slice(0, 80)}
          onRefresh={refresh}
        />
      )}
      {stale && (
        <ListStatus
          variant="stale"
          sectionTitle="⚠️ Cached — network unreachable"
          itemTitle="Showing last successful fetch"
          onRefresh={refresh}
        />
      )}
      <List.Section title="Metrics">
        {availableMetrics.map((metric) => {
          // For sleep metrics, prefer the most recent entry that has the field.
          const entryForMetric = SLEEP_METRICS.has(metric)
            ? latestWithField(sorted, metric)
            : todayData;
          const value = entryForMetric?.[metric];
          const series = sorted.map((d) => d[metric]);
          const dates = sorted.map((d) => d.date);
          const insight = insightFor(metric, value, series);
          const formattedValue = formatMetricValue(metric, value);
          const copyText = `${METRIC_LABELS[metric]}: ${formattedValue}`;

          // Produce a tooltip when the sleep metric came from a prior night.
          const sourceDate = entryForMetric?.date;
          const isStaleDate =
            SLEEP_METRICS.has(metric) &&
            sourceDate != null &&
            sourceDate !== todayDateKey();
          const dateLabel = isStaleDate ? relativeDateLabel(sourceDate) : null;
          const tooltip = dateLabel ? `From ${dateLabel}'s sleep` : undefined;

          return (
            <List.Item
              key={metric}
              title={METRIC_LABELS[metric]}
              icon={metricIcon(metric, insight.status)}
              accessories={[{ text: formattedValue, tooltip }]}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(
                    metric,
                    value,
                    series,
                    dates,
                    insight,
                  )}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                  <Action
                    title="Open Preferences"
                    icon={Icon.Cog}
                    shortcut={{ modifiers: ["cmd"], key: "," }}
                    onAction={openExtensionPreferences}
                  />
                  <Action.CopyToClipboard
                    title={`Copy ${METRIC_LABELS[metric]}`}
                    content={copyText}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
        {!loading && availableMetrics.length === 0 && (
          <List.Item
            title="No data yet today"
            subtitle="Charge and sync your Ring, then refresh."
            icon={Icon.Cloud}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
