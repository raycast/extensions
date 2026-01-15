import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadStats } from "./stats";

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${formatNumber(value * 100, 1)}%`;
}

function buildBar(value: number, maxValue: number, width = 18): string {
  if (maxValue <= 0) {
    return `[${"-".repeat(width)}]`;
  }
  const ratio = Math.min(1, Math.max(0, value / maxValue));
  const filled = Math.round(ratio * width);
  const empty = Math.max(0, width - filled);
  return `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
}

function buildWpmChart(values: number[]): string {
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  return values
    .map((value, index) => `S${index + 1} ${buildBar(value, maxValue)} ${formatNumber(value, 1)} wpm`)
    .join("\n");
}

function buildAccuracyChart(values: number[]): string {
  return values.map((value, index) => `S${index + 1} ${buildBar(value, 1)} ${formatPercent(value)}`).join("\n");
}

function buildMarkdown(stats: Awaited<ReturnType<typeof loadStats>>): string {
  const totalTyped = stats.totalCorrect + stats.totalErrors;
  const overallAccuracy = totalTyped > 0 ? stats.totalCorrect / totalTyped : 0;
  const averageWpm = stats.totalSessions > 0 ? stats.totalWpm / stats.totalSessions : 0;

  const recent = stats.sessions.slice(0, 7);
  const wpmSeries = recent.map((session) => session.wpm);
  const accuracySeries = recent.map((session) => session.accuracy);
  return [
    "# Typing Stats",
    "",
    "| Sessions | Best WPM | Avg WPM | Accuracy | Chars | Errors |",
    "| --- | --- | --- | --- | --- | --- |",
    `| ${stats.totalSessions} | ${formatNumber(stats.bestWpm, 1)} | ${formatNumber(averageWpm, 1)} | ${formatPercent(
      overallAccuracy,
    )} | ${stats.totalChars} | ${stats.totalErrors} |`,
    "",
    recent.length > 0 ? "## WPM (recent sessions)" : "",
    recent.length > 0 ? "```" : "",
    recent.length > 0 ? buildWpmChart(wpmSeries) : "",
    recent.length > 0 ? "```" : "",
    recent.length > 0 ? "## Accuracy (recent sessions)" : "",
    recent.length > 0 ? "```" : "",
    recent.length > 0 ? buildAccuracyChart(accuracySeries) : "",
    recent.length > 0 ? "```" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ShowStats() {
  const { data, isLoading, revalidate } = usePromise(loadStats);

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? buildMarkdown(data) : "# Typing Stats\n\nLoading..."}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
