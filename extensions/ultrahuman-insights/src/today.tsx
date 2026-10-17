import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { METRIC_LABELS, MetricName } from "./lib/types";
import { formatMetricValue, todayDateKey, latestWithField, relativeDateLabel } from "./lib/format";
import { insightFor, deltaVsAverage, formatDeltaArrow, appendInsightLines, Insight } from "./lib/insights";
import { metricIcon } from "./lib/icons";
import { appendSeriesChart } from "./lib/charts";
import { ListStatus } from "./lib/status-view";
import { useDailyRange } from "./lib/use-daily-range";
import { MetricActions } from "./lib/metric-actions";

const SLEEP_METRICS = new Set<MetricName>([
  "sleep_score",
  "total_sleep",
  "rem_sleep",
  "deep_sleep",
  "light_sleep",
  "sleep_efficiency",
]);

function trendLine(metric: MetricName, value: number | undefined, series: Array<number | undefined>): string {
  const delta = deltaVsAverage(value, series, series.length - 1);
  if (!delta) return "";
  if (Math.abs(delta.pct) <= 1) return "";

  const { arrow, deltaStr } = formatDeltaArrow(delta);
  const avgStr = formatMetricValue(metric, delta.avg);

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

  appendInsightLines(lines, insight, { requireContext: false });

  const trend = trendLine(metric, value, series);
  if (trend) {
    lines.push("");
    lines.push(trend);
  }

  appendSeriesChart(lines, series, dates, insight.color);

  return lines.join("\n");
}

export default function Today() {
  const { data, stale, loading, missingToken, error, refresh, sorted } = useDailyRange();

  if (missingToken) {
    return <ListStatus variant="missing-token" />;
  }
  const todayData = sorted[sorted.length - 1] ?? null;

  const metrics = Object.keys(METRIC_LABELS) as MetricName[];
  const availableMetrics = todayData
    ? metrics.filter((m) => {
        if (SLEEP_METRICS.has(m)) {
          return latestWithField(sorted, m)?.[m] != null;
        }
        return todayData[m] != null;
      })
    : [];

  return (
    <List isLoading={loading} isShowingDetail={!loading && !!data}>
      {error && <ListStatus variant="refresh-failed" itemTitle={error.message.slice(0, 80)} onRefresh={refresh} />}
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
          const entryForMetric = SLEEP_METRICS.has(metric) ? latestWithField(sorted, metric) : todayData;
          const value = entryForMetric?.[metric];
          const series = sorted.map((d) => d[metric]);
          const dates = sorted.map((d) => d.date);
          const insight = insightFor(metric, value, series);
          const formattedValue = formatMetricValue(metric, value);
          const copyText = `${METRIC_LABELS[metric]}: ${formattedValue}`;

          const sourceDate = entryForMetric?.date;
          const isStaleDate = SLEEP_METRICS.has(metric) && sourceDate != null && sourceDate !== todayDateKey();
          const dateLabel = isStaleDate ? relativeDateLabel(sourceDate) : null;
          const tooltip = dateLabel ? `From ${dateLabel}'s sleep` : undefined;

          return (
            <List.Item
              key={metric}
              title={METRIC_LABELS[metric]}
              icon={metricIcon(metric, insight.status)}
              accessories={[{ text: formattedValue, tooltip }]}
              detail={<List.Item.Detail markdown={detailMarkdown(metric, value, series, dates, insight)} />}
              actions={
                <MetricActions refresh={refresh} copyTitle={`Copy ${METRIC_LABELS[metric]}`} copyContent={copyText} />
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
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } }}
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
