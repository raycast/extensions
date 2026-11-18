import { List, Icon } from "@raycast/api";
import { METRIC_LABELS, MetricName } from "./lib/types";
import { formatMetricValue, sparkline } from "./lib/format";
import { insightFor, deltaVsAverage, appendInsightLines, Insight } from "./lib/insights";
import { metricIcon } from "./lib/icons";
import { appendSeriesChart } from "./lib/charts";
import { ListStatus } from "./lib/status-view";
import { useDailyRange } from "./lib/use-daily-range";
import { MetricActions } from "./lib/metric-actions";

function trendSummary(metric: MetricName, values: Array<number | undefined>, todayValue: number | undefined): string {
  const delta = deltaVsAverage(todayValue, values, values.length - 1);
  if (!delta) return "";
  const { pct } = delta;
  if (Math.abs(pct) <= 1) return "";
  const dir = pct > 0 ? "up" : "down";
  return `${METRIC_LABELS[metric]} is trending ${dir} ${Math.abs(pct).toFixed(0)}% over the last 7 days.`;
}

function trendMarkdown(
  metric: MetricName,
  values: Array<number | undefined>,
  dates: Array<string | undefined>,
  insight: Insight,
): string {
  const todayValue = values[values.length - 1];
  const lines: string[] = [];

  lines.push(`# ${formatMetricValue(metric, todayValue)}`);
  lines.push(`## ${METRIC_LABELS[metric]}`);
  lines.push("");

  if (insight.status !== "neutral" && insight.context) {
    appendInsightLines(lines, insight);
    lines.push("");
  }

  appendSeriesChart(lines, values, dates, insight.color);

  lines.push("| Date | Value |");
  lines.push("|---|---|");
  dates.forEach((date, i) => {
    lines.push(`| ${date ?? "?"} | ${formatMetricValue(metric, values[i])} |`);
  });

  const summary = trendSummary(metric, values, todayValue);
  if (summary) {
    lines.push("");
    lines.push(`*${summary}*`);
  }

  return lines.join("\n");
}

export default function Trends() {
  const { data, stale, loading, missingToken, error, refresh, sorted } = useDailyRange();

  if (missingToken) {
    return <ListStatus variant="missing-token" />;
  }

  const metrics = Object.keys(METRIC_LABELS) as MetricName[];
  const availableMetrics = data ? metrics.filter((m) => sorted.some((d) => d[m] != null)) : [];

  return (
    <List isLoading={loading} isShowingDetail={!loading && availableMetrics.length > 0}>
      {error && <ListStatus variant="refresh-failed" itemTitle={error.message.slice(0, 80)} onRefresh={refresh} />}
      {stale && (
        <ListStatus
          variant="stale"
          sectionTitle="⚠️ Cached — network unreachable"
          itemTitle="Showing last successful fetch"
          onRefresh={refresh}
        />
      )}
      {!loading && data && availableMetrics.length === 0 && (
        <List.EmptyView
          title="No trend data yet"
          description="Charge and sync your Ring, then refresh."
          icon={Icon.Cloud}
          actions={<MetricActions refresh={refresh} />}
        />
      )}
      {availableMetrics.length > 0 && (
        <List.Section title="Metrics">
          {availableMetrics.map((m) => {
            const values = sorted.map((d) => d[m]);
            const dates = sorted.map((d) => d.date);
            const todayValue = values[values.length - 1];
            const insight = insightFor(m, todayValue, values);
            const formattedValue = formatMetricValue(m, todayValue);
            const copyText = `${METRIC_LABELS[m]}: ${formattedValue}`;

            return (
              <List.Item
                key={m}
                title={METRIC_LABELS[m]}
                icon={metricIcon(m, insight.status)}
                accessories={[{ text: sparkline(values) }]}
                detail={<List.Item.Detail markdown={trendMarkdown(m, values, dates, insight)} />}
                actions={
                  <MetricActions refresh={refresh} copyTitle={`Copy ${METRIC_LABELS[m]}`} copyContent={copyText} />
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
