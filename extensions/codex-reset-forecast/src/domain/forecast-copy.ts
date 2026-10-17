import type { ForecastResponse } from "../api/forecast-schema";
import { formatDateTime, formatPercentage } from "./format-forecast";
import { forecastChart } from "./forecast-chart";
import { latestReset, recordLabel, safeSourceUrl, type HistoryItem } from "./reset-history";

const MARKDOWN_LITERAL_CHARACTERS = new Set("&\\`*_{}<>#+-.!|[]$~");

export function escapeMarkdown(value: string): string {
  return Array.from(value, (character) =>
    MARKDOWN_LITERAL_CHARACTERS.has(character) ? `&#${character.charCodeAt(0)};` : character,
  ).join("");
}

// X excerpts in the snapshot can contain literal backslash-n separators.
export function sourceText(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\r\n?/g, "\n").trim();
}

function prose(value: string): string {
  return escapeMarkdown(sourceText(value)).replace(/(?<!\n)\n(?!\n)/g, "  \n");
}

export function forecastSummary(response: ForecastResponse): string {
  const reset = latestReset(response);
  return [
    `Codex reset likelihood: ${formatPercentage(response.forecast?.score24h)} within 24 hours; ${formatPercentage(response.forecast?.score48h)} within 48 hours.`,
    `Last confirmed reset: ${reset ? formatDateTime(reset.dateTime) : "unknown"}.`,
    `Forecast updated: ${formatDateTime(response.updatedAt)}.`,
    "Source: https://codexreset.org/",
  ].join("\n");
}

export function outlookMarkdown(
  response: ForecastResponse,
  warning?: string,
  appearance: "light" | "dark" = "dark",
  lastCheckedAt?: string,
): string {
  return [
    "# Reset Outlook",
    `![${formatPercentage(response.forecast?.score24h)} within 24 hours; ${formatPercentage(response.forecast?.score48h)} within 48 hours](${forecastChart(response, appearance)})`,
    warning ? `> ${escapeMarkdown(warning)}` : "",
    "### Why this estimate",
    response.forecast?.semanticSummary
      ? prose(response.forecast.semanticSummary)
      : "The source has not published an explanation yet.",
    "---",
    `**Forecast updated** · ${escapeMarkdown(formatDateTime(response.updatedAt))}`,
    lastCheckedAt ? `**Last checked** · ${escapeMarkdown(formatDateTime(lastCheckedAt))}` : "",
    "[Codex Reset Monitor](https://codexreset.org/) · Source estimates",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function historyDetailMarkdown(record: HistoryItem): string {
  const lines = [
    `# ${escapeMarkdown(record.title)}`,
    `**${recordLabel(record)}** · ${escapeMarkdown(formatDateTime(record.dateTime))}`,
  ];
  if (record.evidence) {
    lines.push(
      `### ${escapeMarkdown(record.evidence.author)}${record.evidence.handle ? ` · ${escapeMarkdown(record.evidence.handle)}` : ""}`,
    );
    lines.push(
      prose(record.evidence.summary)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n"),
    );
  }
  if (record.description) lines.push("### Reset details", prose(record.description));
  if (record.scope) lines.push(`**Applies to:** ${prose(record.scope)}`);
  if (record.evidence && record.evidence.createdAt !== record.dateTime)
    lines.push(`**Source posted:** ${escapeMarkdown(formatDateTime(record.evidence.createdAt))}`);
  const source = safeSourceUrl(record.sourceUrl);
  if (source)
    lines.push(
      `Original source: [${escapeMarkdown(record.sourceLabel || "View Source")}](${source.replace(/\(/g, "%28").replace(/\)/g, "%29")})`,
    );
  return lines.join("\n\n");
}

export function historySummary(record: HistoryItem): string {
  return [
    record.title,
    `${recordLabel(record)} · ${formatDateTime(record.dateTime)}`,
    record.scope,
    record.evidence ? sourceText(record.evidence.summary) : record.description,
    record.sourceUrl,
  ]
    .filter(Boolean)
    .join("\n\n");
}
