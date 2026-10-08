import { Detail, Icon } from "@raycast/api";
import { DailyMetricsRange } from "./lib/types";
import { formatDuration, fmt, todayDateKey, latestWithField, relativeDateLabel } from "./lib/format";
import { insightFor, deltaVsAverage, formatDeltaArrow, appendInsightLines, markdownFetchNotes } from "./lib/insights";
import { lineChart, stagesBar, colorToHex } from "./lib/charts";
import { weekdayShortLabels } from "./lib/daily-metrics";
import { DetailStatus } from "./lib/status-view";
import { useDailyRange } from "./lib/use-daily-range";
import { MetricActions } from "./lib/metric-actions";

function markdownFor(range: DailyMetricsRange, stale: boolean, error: Error | null): string {
  const sorted = [...range].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  if (sorted.length === 0) return "No data yet.";

  const d = latestWithField(sorted, "sleep_score");
  if (!d) return "No data yet.";

  const scoreSeries = sorted.map((r) => r.sleep_score);
  const score = d.sleep_score;
  const insight = insightFor("sleep_score", score, scoreSeries);

  const { errorNote, staleNote } = markdownFetchNotes(stale, error);

  const lines: string[] = [];

  const isStaleDate = d.date != null && d.date !== todayDateKey();
  const dateLabel = relativeDateLabel(d.date);
  if (isStaleDate && dateLabel) {
    lines.push(`> 📅 ${dateLabel}'s sleep — today's not recorded yet`);
    lines.push("");
  }

  const headline = score != null ? `# ${insight.emoji} Sleep Score: ${score}` : "# Sleep";
  lines.push(headline);
  lines.push(errorNote);
  lines.push(staleNote);

  appendInsightLines(lines, insight);

  const delta = deltaVsAverage(score, scoreSeries, scoreSeries.length - 1);
  if (delta && Math.abs(delta.pct) > 1) {
    const { arrow } = formatDeltaArrow(delta);
    lines.push("");
    lines.push(`${arrow} **${Math.abs(delta.pct).toFixed(0)}%** vs 7-day average (avg: ${delta.avg.toFixed(0)})`);
  }

  lines.push("");
  lines.push("## Stages");
  const deep = d.deep_sleep ?? 0;
  const rem = d.rem_sleep ?? 0;
  const light = d.light_sleep ?? 0;
  if (deep + rem + light > 0) {
    const bar = stagesBar({ deep, rem, light });
    lines.push(bar);
  } else {
    lines.push("_No stage data available_");
  }

  const validScoreCount = scoreSeries.filter((v) => v != null).length;
  if (validScoreCount >= 3) {
    lines.push("");
    lines.push("## 7-Day Sleep Score");
    const hexColor = colorToHex(insight.color);
    const chart = lineChart(scoreSeries, {
      color: hexColor,
      labels: weekdayShortLabels(sorted.map((r) => r.date)),
    });
    if (chart) lines.push(chart);
  }

  return lines.join("\n");
}

function SleepMetadata({ range }: { range: DailyMetricsRange }) {
  const sorted = [...range].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const d = latestWithField(sorted, "sleep_score");
  if (!d) return null;

  const scoreSeries = sorted.map((r) => r.sleep_score);
  const insight = insightFor("sleep_score", d.sleep_score, scoreSeries);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Sleep Score"
        text={{ value: String(d.sleep_score ?? "—"), color: insight.color }}
        icon={{ source: Icon.Moon, tintColor: insight.color }}
      />
      <Detail.Metadata.Label title="Total Sleep" text={formatDuration(d.total_sleep)} />
      <Detail.Metadata.Label title="Sleep Efficiency" text={fmt(d.sleep_efficiency, "%")} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="REM" text={formatDuration(d.rem_sleep)} />
      <Detail.Metadata.Label title="Deep" text={formatDuration(d.deep_sleep)} />
      <Detail.Metadata.Label title="Light" text={formatDuration(d.light_sleep)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="HRV" text={fmt(d.hrv, "ms")} />
      <Detail.Metadata.Label title="Night RHR" text={fmt(d.night_rhr, "bpm")} />
      <Detail.Metadata.Label title="Avg Body Temp" text={fmt(d.avg_body_temperature, "°C")} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Restorative" text={fmt(d.restorative_sleep, "%")} />
      <Detail.Metadata.Label title="Sleep Cycles" text={fmt(d.sleep_cycles)} />
      <Detail.Metadata.Label title="Tosses & Turns" text={fmt(d.tosses_turns)} />
    </Detail.Metadata>
  );
}

export default function Sleep() {
  const { data, stale, loading, missingToken, error, refresh, sorted } = useDailyRange();

  const sleepEntry = latestWithField(sorted, "sleep_score");
  const copyValue = sleepEntry?.sleep_score != null ? `Sleep Score: ${sleepEntry.sleep_score}` : null;

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
      metadata={data ? <SleepMetadata range={data} /> : undefined}
      actions={<MetricActions refresh={refresh} copyTitle="Copy Sleep Score" copyContent={copyValue} />}
    />
  );
}
