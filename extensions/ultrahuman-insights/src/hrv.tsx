import { Detail, Icon } from "@raycast/api";
import { DailyMetricsRange } from "./lib/types";
import { fmt } from "./lib/format";
import {
  insightFor,
  deltaVsAverage,
  avgExcludingLast,
  formatDeltaArrow,
  appendInsightLines,
  markdownFetchNotes,
} from "./lib/insights";
import { lineChart, colorToHex } from "./lib/charts";
import { weekdayShortLabels } from "./lib/daily-metrics";
import { DetailStatus } from "./lib/status-view";
import { useDailyRange } from "./lib/use-daily-range";
import { MetricActions } from "./lib/metric-actions";

function trendDeltaLine(value: number | undefined, unit: string, series: Array<number | undefined>): string {
  if (value == null) return "";
  const delta = deltaVsAverage(value, series, series.length - 1);
  if (!delta || Math.abs(delta.pct) <= 1) return `Today: **${fmt(value, unit)}**`;
  const { arrow, deltaStr } = formatDeltaArrow(delta);
  return `Today: **${fmt(value, unit)}** · ${arrow} ${deltaStr} vs 7-day average`;
}

function markdownFor(range: DailyMetricsRange, stale: boolean, error: Error | null): string {
  const sorted = [...range].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const todayEntry = sorted[sorted.length - 1];
  const hrvSeries = sorted.map((d) => d.hrv);
  const rhrSeries = sorted.map((d) => d.night_rhr);

  const { errorNote, staleNote } = markdownFetchNotes(stale, error);

  const lines: string[] = [];

  lines.push("# HRV & Heart Rate");
  lines.push(errorNote);
  lines.push(staleNote);

  const hrvInsight = insightFor("hrv", todayEntry?.hrv, hrvSeries);
  appendInsightLines(lines, hrvInsight);
  lines.push("");

  lines.push(trendDeltaLine(todayEntry?.hrv, "ms", hrvSeries));

  const shortLabels = weekdayShortLabels(sorted.map((r) => r.date));

  const validHrv = hrvSeries.filter((v) => v != null).length;
  if (validHrv >= 3) {
    lines.push("");
    lines.push("## HRV (7 Days)");
    const hrvHex = colorToHex(hrvInsight.color);
    const chart = lineChart(hrvSeries, { color: hrvHex, labels: shortLabels });
    if (chart) lines.push(chart);
  }

  const validRhr = rhrSeries.filter((v) => v != null).length;
  if (validRhr >= 3) {
    lines.push("");
    lines.push("## Night RHR (7 Days)");
    const rhrInsight = insightFor("night_rhr", todayEntry?.night_rhr, rhrSeries);
    const rhrHex = colorToHex(rhrInsight.color);
    const rhrChart = lineChart(rhrSeries, {
      color: rhrHex,
      labels: shortLabels,
    });
    if (rhrChart) lines.push(rhrChart);
  }

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
  const sorted = [...range].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const today = sorted[sorted.length - 1];
  if (!today) return null;

  const hrvSeries = sorted.map((d) => d.hrv);
  const rhrSeries = sorted.map((d) => d.night_rhr);
  const insight = insightFor("hrv", today.hrv, hrvSeries);

  const hrvAvg = avgExcludingLast(hrvSeries);
  const rhrAvg = avgExcludingLast(rhrSeries);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="HRV"
        text={{ value: fmt(today.hrv, "ms"), color: insight.color }}
        icon={{ source: Icon.Heartbeat, tintColor: insight.color }}
      />
      <Detail.Metadata.Label title="Night RHR" text={fmt(today.night_rhr, "bpm")} />
      <Detail.Metadata.Label title="HR Drop" text={fmt(today.hr_drop, "bpm")} />
      <Detail.Metadata.Label title="Resting HR" text={fmt(today.hr, "bpm")} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="7-day HRV avg" text={hrvAvg != null ? fmt(Math.round(hrvAvg), "ms") : "—"} />
      <Detail.Metadata.Label title="7-day RHR avg" text={rhrAvg != null ? fmt(Math.round(rhrAvg), "bpm") : "—"} />
    </Detail.Metadata>
  );
}

export default function Hrv() {
  const { data, stale, loading, missingToken, error, refresh, sorted } = useDailyRange();

  const todayEntry = sorted[sorted.length - 1];
  const copyValue = todayEntry?.hrv != null ? `HRV: ${todayEntry.hrv} ms` : null;

  if (missingToken) {
    return <DetailStatus variant="missing-token" />;
  }

  if (error && !data && !loading) {
    return <DetailStatus variant="refresh-failed" message={error.message} onRefresh={refresh} />;
  }

  if (!data && !loading) {
    return <DetailStatus variant="no-data" onRefresh={refresh} />;
  }

  const markdown = data ? markdownFor(data, stale, error) : "Loading…";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      metadata={data ? <HrvMetadata range={data} /> : undefined}
      actions={<MetricActions refresh={refresh} copyTitle="Copy HRV" copyContent={copyValue} />}
    />
  );
}
