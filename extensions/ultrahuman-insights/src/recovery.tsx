import {
  List,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange, MetricName } from "./lib/types";
import { fmt, lastNDaysEpoch, todayDateKey } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage } from "./lib/insights";
import { metricIcon } from "./lib/icons";
import { lineChart, colorToHex } from "./lib/charts";
import { ListStatus } from "./lib/status-view";

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
): string {
  const insight = insightFor(def.metric, value, series);
  const lines: string[] = [];

  const displayVal = value != null ? fmt(value) : "—";
  lines.push(`# ${insight.emoji} ${displayVal}`);
  lines.push(`## ${def.label}`);
  lines.push("");

  if (insight.status !== "neutral" && insight.context) {
    const statusLine = insight.label
      ? `**${insight.label}** — ${insight.context}`
      : insight.context;
    lines.push(statusLine);
  }
  if (insight.recommendation) {
    lines.push("");
    lines.push(`**Recommend:** ${insight.recommendation}`);
  }

  // Delta vs 7-day average
  const delta = deltaVsAverage(value, series, series.length - 1);
  if (delta && Math.abs(delta.pct) > 1) {
    const up = delta.delta > 0;
    const bigMove = Math.abs(delta.pct) > 5;
    const arrow = up ? (bigMove ? "⏫" : "⬆️") : bigMove ? "⏬" : "⬇️";
    const sign = delta.delta > 0 ? "+" : "";
    const deltaStr = `${sign}${Number.isInteger(delta.delta) ? delta.delta : delta.delta.toFixed(1)}`;
    lines.push("");
    lines.push(
      `${arrow} **${deltaStr}** vs 7-day average (avg: ${delta.avg.toFixed(0)})`,
    );
  }

  // Mini line chart (≥3 valid data points)
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
}: {
  value: number | undefined;
  series: Array<number | undefined>;
}) {
  // 7-day avg excluding today (last element)
  const avg =
    series.length > 1
      ? (() => {
          const base = series
            .slice(0, -1)
            .filter((v): v is number => v != null);
          return base.length > 0
            ? base.reduce((a, b) => a + b, 0) / base.length
            : null;
        })()
      : null;

  const delta = value != null && avg != null ? Math.round(value - avg) : null;
  const deltaStr =
    delta != null ? (delta > 0 ? `+${delta}` : String(delta)) : "—";

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Score"
        text={value != null ? String(value) : "—"}
      />
      <List.Item.Detail.Metadata.Label
        title="7-day avg"
        text={avg != null ? String(Math.round(avg)) : "—"}
      />
      <List.Item.Detail.Metadata.Label title="Today vs avg" text={deltaStr} />
    </List.Item.Detail.Metadata>
  );
}

export default function Recovery() {
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
  const todayEntry = sorted[sorted.length - 1] ?? null;

  const shortLabels = sorted.map((r) => {
    if (!r.date) return "";
    const date = new Date(r.date + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  return (
    <List
      isLoading={loading}
      isShowingDetail={!loading && !!data}
      navigationTitle="Recovery & Movement"
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
          itemTitle="Network unreachable — data may be outdated"
          onRefresh={refresh}
        />
      )}
      <List.Section title="Indices">
        {INDICES.map((def) => {
          const value = todayEntry?.[def.metric];
          const series = sorted.map((r) => r[def.metric]);
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
                  markdown={indexDetailMarkdown(
                    def,
                    value,
                    series,
                    shortLabels,
                  )}
                  metadata={<IndexMetadata value={value} series={series} />}
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
                  {copyValue && (
                    <Action.CopyToClipboard
                      title={`Copy ${def.label}`}
                      content={copyValue}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
