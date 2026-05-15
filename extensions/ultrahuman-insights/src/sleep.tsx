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
import {
  formatDuration,
  fmt,
  lastNDaysEpoch,
  todayDateKey,
  latestWithField,
  relativeDateLabel,
} from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage } from "./lib/insights";
import { lineChart, stagesBar, colorToHex } from "./lib/charts";
import { DetailStatus } from "./lib/status-view";

function markdownFor(
  range: DailyMetricsRange,
  stale: boolean,
  error: Error | null,
): string {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  if (sorted.length === 0) return "No data yet.";

  // Use the most recent entry that has a sleep_score rather than blindly
  // picking today's entry (which may be empty when queried before sync).
  const d = latestWithField(sorted, "sleep_score");
  if (!d) return "No data yet.";

  const scoreSeries = sorted.map((r) => r.sleep_score);
  const score = d.sleep_score;
  const insight = insightFor("sleep_score", score, scoreSeries);

  const error_note = error ? `\n> ❌ Refresh failed: ${error.message}\n` : "";
  const stale_note = stale ? "\n> ⚠️ Cached — network unreachable\n" : "";

  const lines: string[] = [];

  // Show a banner when the displayed entry isn't from today
  const isStaleDate = d.date != null && d.date !== todayDateKey();
  const dateLabel = relativeDateLabel(d.date);
  if (isStaleDate && dateLabel) {
    lines.push(`> 📅 ${dateLabel}'s sleep — today's not recorded yet`);
    lines.push("");
  }

  // Headline — compact (values now live in metadata rail)
  const headline =
    score != null ? `# ${insight.emoji} Sleep Score: ${score}` : "# Sleep";
  lines.push(headline);
  lines.push(error_note);
  lines.push(stale_note);

  // Insight context
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

  // Trend delta
  const delta = deltaVsAverage(score, scoreSeries, scoreSeries.length - 1);
  if (delta && Math.abs(delta.pct) > 1) {
    const up = delta.delta > 0;
    const bigMove = Math.abs(delta.pct) > 5;
    const arrow = up ? (bigMove ? "⏫" : "⬆️") : bigMove ? "⏬" : "⬇️";
    lines.push("");
    lines.push(
      `${arrow} **${Math.abs(delta.pct).toFixed(0)}%** vs 7-day average (avg: ${delta.avg.toFixed(0)})`,
    );
  }

  // Sleep stages bar
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

  // Sleep score trend chart (7 days) — uses full range, not just the sleep entry
  const validScoreCount = scoreSeries.filter((v) => v != null).length;
  if (validScoreCount >= 3) {
    lines.push("");
    lines.push("## 7-Day Sleep Score");
    const hexColor = colorToHex(insight.color);
    const shortLabels = sorted.map((r) => {
      if (!r.date) return "";
      const date = new Date(r.date + "T12:00:00");
      return date.toLocaleDateString("en-US", { weekday: "short" });
    });
    const chart = lineChart(scoreSeries, {
      color: hexColor,
      labels: shortLabels,
    });
    if (chart) lines.push(chart);
  }

  return lines.join("\n");
}

function SleepMetadata({ range }: { range: DailyMetricsRange }) {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  // Use the most recent entry with a sleep_score (gracefully handles early-morning
  // queries before today's sleep has synced from the Ring).
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
      <Detail.Metadata.Label
        title="Total Sleep"
        text={formatDuration(d.total_sleep)}
      />
      <Detail.Metadata.Label
        title="Sleep Efficiency"
        text={fmt(d.sleep_efficiency, "%")}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="REM" text={formatDuration(d.rem_sleep)} />
      <Detail.Metadata.Label title="Deep" text={formatDuration(d.deep_sleep)} />
      <Detail.Metadata.Label
        title="Light"
        text={formatDuration(d.light_sleep)}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="HRV" text={fmt(d.hrv, "ms")} />
      <Detail.Metadata.Label title="Night RHR" text={fmt(d.night_rhr, "bpm")} />
      <Detail.Metadata.Label
        title="Avg Body Temp"
        text={fmt(d.avg_body_temperature, "°C")}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Restorative"
        text={fmt(d.restorative_sleep, "%")}
      />
      <Detail.Metadata.Label title="Sleep Cycles" text={fmt(d.sleep_cycles)} />
      <Detail.Metadata.Label
        title="Tosses & Turns"
        text={fmt(d.tosses_turns)}
      />
    </Detail.Metadata>
  );
}

export default function Sleep() {
  const dateKey = todayDateKey();
  const range = useMemo(() => lastNDaysEpoch(7), [dateKey]);
  const fetcher = useCallback(() => getRange(range.start, range.end), [range]);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetricsRange>(fetcher);

  const refresh = useCallback(async () => {
    clearRange(range.start, range.end);
    await reload();
  }, [range, reload]);

  // Determine the primary value for Copy action
  const sorted = useMemo(
    () =>
      data
        ? [...data].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        : [],
    [data],
  );
  const sleepEntry = latestWithField(sorted, "sleep_score");
  const copyValue =
    sleepEntry?.sleep_score != null
      ? `Sleep Score: ${sleepEntry.sleep_score}`
      : null;

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
      metadata={data ? <SleepMetadata range={data} /> : undefined}
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
              title="Copy Sleep Score"
              content={copyValue}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
