import type { ForecastResponse, ResetAlert } from "../api/forecast-schema";
import { SOURCE_CREDIT, WEBSITE_URL } from "../api/forecast-client";
import { formatDateTime, formatPercentage } from "./format-forecast";
import { forecastChart } from "./forecast-chart";
import { bankedStatusLabel, latestReset, recordLabel, safeSourceUrl, type HistoryItem } from "./reset-history";

// Escape ':' as well so Raycast does not auto-link partially escaped URLs in source prose.
const MARKDOWN_LITERAL_CHARACTERS = new Set("&\\`*_{}<>#+-.:!|[]$~");
export const sourceCreditMarkdown = `[${SOURCE_CREDIT}](${WEBSITE_URL})`;
export function escapeMarkdown(value: string): string {
  return Array.from(value, (character) =>
    MARKDOWN_LITERAL_CHARACTERS.has(character) ? `&#${character.charCodeAt(0)};` : character,
  ).join("");
}
export function sourceText(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\r\n?/g, "\n").trim();
}
function prose(value: string): string {
  return escapeMarkdown(sourceText(value)).replace(/(?<!\n)\n(?!\n)/g, "  \n");
}
export function confidenceLabel(response: ForecastResponse): string {
  const confidence = response.forecast?.confidence;
  return confidence ? confidence.charAt(0).toUpperCase() + confidence.slice(1) : "Unavailable";
}
export function alertTitle(alert: ResetAlert): string {
  if (alert.kind === "reset") return "Reset";
  return alert.state === "expired" ? "Expired Watch" : "Reset Watch";
}
export function forecastSummary(response: ForecastResponse): string {
  const reset = latestReset(response);
  return [
    `Codex reset likelihood: ${formatPercentage(response.forecast?.score24h)} within 24 hours; ${formatPercentage(response.forecast?.score48h)} within 48 hours.`,
    `Confidence: ${confidenceLabel(response)}.`,
    `Last verified reset: ${reset ? formatDateTime(reset.dateTime) : "unknown"}.`,
    `Forecast updated: ${formatDateTime(response.updatedAt)}.`,
    `Data: ${WEBSITE_URL}`,
  ].join("\n");
}
export function outlookMarkdown(
  response: ForecastResponse,
  warning?: string,
  appearance: "light" | "dark" = "dark",
  lastCheckedAt?: string,
): string {
  const reset = latestReset(response);
  return [
    "# Model Outlook",
    `![${formatPercentage(response.forecast?.score24h)} within 24 hours; ${formatPercentage(response.forecast?.score48h)} within 48 hours](${forecastChart(response, appearance)})`,
    warning ? `> ${escapeMarkdown(warning)}` : "",
    `**Model confidence** · ${escapeMarkdown(confidenceLabel(response))}`,
    response.forecast?.hasOfficialSignal
      ? "**Official signal** · A reset watch is active. See the latest notice for its announced window."
      : "**Official signal** · No active reset watch. These probabilities are the provider’s experimental outlook, not a schedule or a guarantee.",
    `**Last verified reset** · ${reset ? escapeMarkdown(formatDateTime(reset.dateTime)) : "Unknown"}`,
    "[How the forecast works](https://codex-reset.com/forecast-method)",
    "---",
    `**Forecast updated** · ${escapeMarkdown(formatDateTime(response.updatedAt))}`,
    lastCheckedAt ? `**Last checked** · ${escapeMarkdown(formatDateTime(lastCheckedAt))}` : "",
    sourceCreditMarkdown,
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function alertMarkdown(alert: ResetAlert): string {
  const source = safeSourceUrl(alert.confirmation_url) ?? safeSourceUrl(alert.url);
  return [
    `# ${alertTitle(alert)}`,
    `**${escapeMarkdown(formatDateTime(alert.source_at))}**`,
    `**State** · ${escapeMarkdown(alert.state)}`,
    prose(alert.observation_message || alert.summary),
    alert.window
      ? `**Announced window** · ${prose(alert.window.label)}\n\n${escapeMarkdown(formatDateTime(alert.window.start_at))} – ${escapeMarkdown(formatDateTime(alert.window.end_at))}`
      : "",
    source ? `[Original source](${source.replace(/\(/g, "%28").replace(/\)/g, "%29")})` : "",
    sourceCreditMarkdown,
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function historyDetailMarkdown(record: HistoryItem, timeZone?: string): string {
  return [
    `# ${escapeMarkdown(record.title)}`,
    `**${escapeMarkdown(formatDateTime(record.dateTime, timeZone))}**`,
    prose(record.description),
    record.type === "banked-reset" && bankedStatusLabel(record)
      ? `**Status** · ${escapeMarkdown(bankedStatusLabel(record)!)}`
      : "",
    record.sourceLabel ? `**Record source** · ${prose(record.sourceLabel)}` : "",
    safeSourceUrl(record.sourceUrl)
      ? `[Original source](${safeSourceUrl(record.sourceUrl)!.replace(/\(/g, "%28").replace(/\)/g, "%29")})`
      : "",
    sourceCreditMarkdown,
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function historySummary(record: HistoryItem, timeZone?: string): string {
  return [
    record.title,
    `${recordLabel(record)} · ${formatDateTime(record.dateTime, timeZone)}`,
    sourceText(record.description),
    record.bankedState,
    record.sourceUrl,
    `Data: ${WEBSITE_URL}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
