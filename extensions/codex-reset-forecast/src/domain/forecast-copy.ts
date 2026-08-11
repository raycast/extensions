import type { ForecastHistoryEntry, ForecastResponse } from "../api/forecast-schema";
import { formatDateTime, formatPercentage, formatRelativeTime, scoreTransition } from "./format-forecast";

function escapeMarkdown(value: string): string {
  return value
    .replace(/([\\`*_{}<>#+\-.!|])/g, "\\$1")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

export function forecastSummary(response: ForecastResponse, now = new Date()): string {
  return [
    `Codex reset likelihood: ${formatPercentage(response.forecast.score)}.`,
    `Last confirmed reset: ${formatRelativeTime(response.forecast.latestResetAt, now)}.`,
    `Forecast checked: ${formatDateTime(response.fetchedAt)}.`,
    "Unofficial and not affiliated with OpenAI.",
  ].join(" ");
}

export function historyDetailMarkdown(entry: ForecastHistoryEntry): string {
  const sections = entry.changes.map((change) => {
    const source = change.details?.find((detail) => detail.action.trim().toLocaleLowerCase("en-US") === "source post");
    const explanations = (change.details ?? []).filter(
      (detail) => detail.action.trim().toLocaleLowerCase("en-US") !== "source post",
    );
    const delta = `${change.delta > 0 ? "+" : ""}${change.delta} pts`;
    const lines = [`## ${escapeMarkdown(change.label)}`, `**${escapeMarkdown(delta)}**`];

    if (source?.name) lines.push(`> ${escapeMarkdown(source.name)}`);
    for (const detail of explanations) {
      lines.push(`**${escapeMarkdown(detail.action)}:** ${escapeMarkdown(detail.name)}`);
    }

    return lines.join("\n\n");
  });

  return [
    `# ${scoreTransition(entry.fromScore, entry.toScore)}`,
    `Updated ${escapeMarkdown(formatDateTime(entry.at))}`,
    ...sections,
  ].join("\n\n");
}
