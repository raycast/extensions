import { List } from "@raycast/api";
import { MetricName } from "./lib/types";
import { fmt, latestWithField } from "./lib/format";
import { insightFor, deltaVsAverage, avgExcludingIndex, formatDeltaArrow, appendInsightLines } from "./lib/insights";
import { metricIcon } from "./lib/icons";
import { lineChart, colorToHex } from "./lib/charts";
import { weekdayShortLabels } from "./lib/daily-metrics";
import { ListStatus } from "./lib/status-view";
import { useDailyRange } from "./lib/use-daily-range";
import { MetricActions } from "./lib/metric-actions";

interface IndexDef {
  metric: MetricName;
  label: string;
}

const INDICES: IndexDef[] = [
  { metric: "recovery_index", label: "Recovery Index" },
  { metric: "movement_index", label: "Movement Index" },
  { metric: "sleep_score", label: "Sleep Index" },
];

function indexDetailMarkdown(
  def: IndexDef,
  value: number | undefined,
  series: Array<number | undefined>,
  shortLabels: string[],
  baselineExcludeIndex: number,
): string {
  const insight = insightFor(def.metric, value, series);
  const lines: string[] = [];

  const displayVal = value != null ? fmt(value) : "—";
  lines.push(`# ${insight.emoji} ${displayVal}`);
  lines.push(`## ${def.label}`);
  lines.push("");

  appendInsightLines(lines, insight);

  const delta = deltaVsAverage(value, series, baselineExcludeIndex);
  if (delta && Math.abs(delta.pct) > 1) {
    const { arrow, deltaStr } = formatDeltaArrow(delta);
    lines.push("");
    lines.push(`${arrow} **${deltaStr}** vs 7-day average (avg: ${delta.avg.toFixed(0)})`);
  }

  const validCount = series.filter((v) => v != null).length;
  if (validCount >= 3) {
    const hexColor = colorToHex(insight.color);
    const chart = lineChart(series, {
      height: 80,
      color: hexColor,
      labels: shortLabels,
    });
    if (chart) {
      lines.push("");
      lines.push(chart);
    }
  }

  return lines.join("\n");
}

function IndexMetadata({
  value,
  series,
  baselineExcludeIndex,
}: {
  value: number | undefined;
  series: Array<number | undefined>;
  baselineExcludeIndex: number;
}) {
  const avg = avgExcludingIndex(series, baselineExcludeIndex);
  const delta = value != null && avg != null ? Math.round(value - avg) : null;
  const deltaStr = delta != null ? (delta > 0 ? `+${delta}` : String(delta)) : "—";

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Score" text={value != null ? String(value) : "—"} />
      <List.Item.Detail.Metadata.Label title="7-day avg" text={avg != null ? String(Math.round(avg)) : "—"} />
      <List.Item.Detail.Metadata.Label title="Today vs avg" text={deltaStr} />
    </List.Item.Detail.Metadata>
  );
}

export default function Recovery() {
  const { data, stale, loading, missingToken, error, refresh, sorted } = useDailyRange();

  if (missingToken) {
    return <ListStatus variant="missing-token" />;
  }
  const todayEntry = sorted[sorted.length - 1] ?? null;

  const shortLabels = weekdayShortLabels(sorted.map((r) => r.date));

  return (
    <List isLoading={loading} isShowingDetail={!loading && !!data}>
      {error && <ListStatus variant="refresh-failed" itemTitle={error.message.slice(0, 80)} onRefresh={refresh} />}
      {stale && (
        <ListStatus variant="stale" itemTitle="Network unreachable — data may be outdated" onRefresh={refresh} />
      )}
      <List.Section title="Indices">
        {INDICES.map((def) => {
          const sleepSource =
            def.metric === "sleep_score"
              ? todayEntry?.sleep_score != null
                ? todayEntry
                : latestWithField(sorted, "sleep_score")
              : null;
          const value = def.metric === "sleep_score" ? sleepSource?.sleep_score : todayEntry?.[def.metric];
          const series = sorted.map((r) => r[def.metric]);
          const baselineExcludeIndex =
            def.metric === "sleep_score" && sleepSource
              ? sorted.findIndex((r) => r.date === sleepSource.date)
              : series.length - 1;
          const insight = insightFor(def.metric, value, series);
          const copyValue = value != null ? `${def.label}: ${value}` : null;

          return (
            <List.Item
              key={def.metric}
              title={def.label}
              icon={metricIcon(def.metric, insight.status)}
              accessories={[{ text: value != null ? String(value) : "—" }]}
              detail={
                <List.Item.Detail
                  markdown={indexDetailMarkdown(def, value, series, shortLabels, baselineExcludeIndex)}
                  metadata={<IndexMetadata value={value} series={series} baselineExcludeIndex={baselineExcludeIndex} />}
                />
              }
              actions={<MetricActions refresh={refresh} copyTitle={`Copy ${def.label}`} copyContent={copyValue} />}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
