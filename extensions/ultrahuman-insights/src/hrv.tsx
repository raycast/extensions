import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange } from "./lib/types";
import { fmt, lastNDaysEpoch, todayDateKey } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage } from "./lib/insights";
import { lineChart, colorToHex } from "./lib/charts";
import { DetailStatus } from "./lib/status-view";

function trendDeltaLine(
  value: number | undefined,
  unit: string,
  series: Array<number | undefined>,
): string {
  if (value == null) return "";
  const delta = deltaVsAverage(value, series, series.length - 1);
  if (!delta || Math.abs(delta.pct) <= 1)
    return `Today: **${fmt(value, unit)}**`;
  const up = delta.delta > 0;
  const bigMove = Math.abs(delta.pct) > 5;
  const arrow = up ? (bigMove ? "⏫" : "⬆️") : bigMove ? "⏬" : "⬇️";
  const sign = delta.delta > 0 ? "+" : "";
  const deltaStr = `${sign}${Number.isInteger(delta.delta) ? delta.delta : delta.delta.toFixed(1)}`;
  return `Today: **${fmt(value, unit)}** · ${arrow} ${deltaStr} vs 7-day average`;
}

function markdownFor(
  range: DailyMetricsRange,
  stale: boolean,
  error: Error | null,
): string {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  const todayEntry = sorted[sorted.length - 1];
  const hrvSeries = sorted.map((d) => d.hrv);
  const rhrSeries = sorted.map((d) => d.night_rhr);

  const error_note = error ? `\n> ❌ Refresh failed: ${error.message}\n` : "";
  const stale_note = stale ? "\n> ⚠️ Cached — network unreachable\n" : "";

  const lines: string[] = [];

  lines.push("# HRV & Heart Rate");
  lines.push(error_note);
  lines.push(stale_note);

  // HRV headline insight
  const hrvInsight = insightFor("hrv", todayEntry?.hrv, hrvSeries);
  if (hrvInsight.status !== "neutral" && hrvInsight.context) {
    const statusLine = hrvInsight.label
      ? `**${hrvInsight.label}** — ${hrvInsight.context}`
      : hrvInsight.context;
    lines.push(statusLine);
  }
  if (hrvInsight.recommendation) {
    lines.push("");
    lines.push(`**Recommend:** ${hrvInsight.recommendation}`);
  }
  lines.push("");

  // HRV trend delta line
  lines.push(trendDeltaLine(todayEntry?.hrv, "ms", hrvSeries));

  const shortLabels = sorted.map((r) => {
    if (!r.date) return "";
    const date = new Date(r.date + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  // HRV line chart
  const validHrv = hrvSeries.filter((v) => v != null).length;
  if (validHrv >= 3) {
    lines.push("");
    lines.push("## HRV (7 Days)");
    const hrvHex = colorToHex(hrvInsight.color);
    const chart = lineChart(hrvSeries, { color: hrvHex, labels: shortLabels });
    if (chart) lines.push(chart);
  }

  // Night RHR line chart
  const validRhr = rhrSeries.filter((v) => v != null).length;
  if (validRhr >= 3) {
    lines.push("");
    lines.push("## Night RHR (7 Days)");
    const rhrInsight = insightFor(
      "night_rhr",
      todayEntry?.night_rhr,
      rhrSeries,
    );
    const rhrHex = colorToHex(rhrInsight.color);
    const rhrChart = lineChart(rhrSeries, {
      color: rhrHex,
      labels: shortLabels,
    });
    if (rhrChart) lines.push(rhrChart);
  }

  // Daily values table
  lines.push("");
  lines.push("## Daily Values");
  lines.push("");
  lines.push("| Date | HRV (ms) | Night RHR (bpm) |");
  lines.push("|---|---|---|");
  sorted.forEach((d) => {
    lines.push(`| ${d.date ?? "?"} | ${fmt(d.hrv)} | ${fmt(d.night_rhr)} |`);
  });

  return lines.join("\n");
}

function HrvMetadata({ range }: { range: DailyMetricsRange }) {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  const today = sorted[sorted.length - 1];
  if (!today) return null;

  const hrvSeries = sorted.map((d) => d.hrv);
  const rhrSeries = sorted.map((d) => d.night_rhr);
  const insight = insightFor("hrv", today.hrv, hrvSeries);

  // Compute 7-day averages (exclude today = last element)
  const hrvAvg =
    hrvSeries.length > 1
      ? (() => {
          const base = hrvSeries
            .slice(0, -1)
            .filter((v): v is number => v != null);
          return base.length > 0
            ? base.reduce((a, b) => a + b, 0) / base.length
            : null;
        })()
      : null;

  const rhrAvg =
    rhrSeries.length > 1
      ? (() => {
          const base = rhrSeries
            .slice(0, -1)
            .filter((v): v is number => v != null);
          return base.length > 0
            ? base.reduce((a, b) => a + b, 0) / base.length
            : null;
        })()
      : null;

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="HRV"
        text={{ value: fmt(today.hrv, "ms"), color: insight.color }}
        icon={{ source: Icon.Heartbeat, tintColor: insight.color }}
      />
      <Detail.Metadata.Label
        title="Night RHR"
        text={fmt(today.night_rhr, "bpm")}
      />
      <Detail.Metadata.Label title="HR Drop" text={fmt(today.hr_drop, "bpm")} />
      <Detail.Metadata.Label title="Resting HR" text={fmt(today.hr, "bpm")} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="7-day HRV avg"
        text={hrvAvg != null ? fmt(Math.round(hrvAvg), "ms") : "—"}
      />
      <Detail.Metadata.Label
        title="7-day RHR avg"
        text={rhrAvg != null ? fmt(Math.round(rhrAvg), "bpm") : "—"}
      />
    </Detail.Metadata>
  );
}

export default function Hrv() {
  const dateKey = todayDateKey();
  const range = useMemo(() => lastNDaysEpoch(7), [dateKey]);
  const fetcher = useCallback(() => getRange(range.start, range.end), [range]);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetricsRange>(fetcher);

  const refresh = useCallback(async () => {
    clearRange(range.start, range.end);
    await reload();
  }, [range, reload]);

  const sorted = useMemo(
    () =>
      data
        ? [...data].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        : [],
    [data],
  );
  const todayEntry = sorted[sorted.length - 1];
  const copyValue =
    todayEntry?.hrv != null ? `HRV: ${todayEntry.hrv} ms` : null;

  if (missingToken) {
    return <DetailStatus variant="missing-token" />;
  }

  const markdown = data
    ? markdownFor(data, stale, error)
    : loading
      ? "Loading…"
      : "No data yet.";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      metadata={data ? <HrvMetadata range={data} /> : undefined}
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
              title="Copy HRV"
              content={copyValue}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
