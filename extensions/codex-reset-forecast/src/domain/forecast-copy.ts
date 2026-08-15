import type { ForecastHistoryEntry, ForecastResponse } from "../api/forecast-schema";
import { formatDateTime, formatPercentage, formatRelativeTime, scoreTransition } from "./format-forecast";

type ForecastNarrative = {
  advice: string;
  summary: string;
  title: string;
};

function escapeMarkdown(value: string): string {
  return value
    .replace(/([\\`*_{}<>#+\-.!|])/g, "\\$1")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function escapedProse(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => escapeMarkdown(paragraph).replace(/\n/g, "  \n"))
    .join("\n\n");
}

function blockquote(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function sourcePostMarkdown(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  const divider = /(?:^|\s)={3,}(?=\s|$)/.exec(normalized);

  if (!divider) return blockquote(escapedProse(normalized));

  const introduction = normalized.slice(0, divider.index).trim();
  const remainder = normalized.slice(divider.index + divider[0].length).trim();
  const bulletItems = remainder.startsWith("-")
    ? remainder
        .split(/(?:^|\s)-\s+(?=\S)/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const body =
    bulletItems.length > 0
      ? bulletItems.map((item) => `- ${escapeMarkdown(item)}`).join("\n")
      : escapedProse(remainder);

  return blockquote([escapedProse(introduction), body].filter(Boolean).join("\n\n"));
}

export function forecastSummary(
  response: ForecastResponse,
  lastSuccessfulRequestAt = response.fetchedAt,
  now = new Date(),
): string {
  return [
    `Codex reset likelihood: ${formatPercentage(response.forecast.score)}.`,
    `Last confirmed reset: ${formatRelativeTime(response.forecast.latestResetAt, now)}.`,
    `Forecast checked: ${formatDateTime(lastSuccessfulRequestAt)}.`,
    "Unofficial and not affiliated with OpenAI.",
  ].join(" ");
}

function shortAge(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function forecastNarrative(response: ForecastResponse, now = new Date()): ForecastNarrative {
  const hoursSinceReset = Math.max(0, now.getTime() - new Date(response.forecast.latestResetAt).getTime()) / 3_600_000;

  if (response.forecast.resetAnnounced) {
    return {
      advice: "Treat the forecast as certain, but do not count the new quota until it lands.",
      summary:
        "Tibo announced a Codex rate-limit reset in the next 48 hours. It has not happened yet, so the reset clock and cooldown have not moved.",
      title: "Reset announced.",
    };
  }

  if (hoursSinceReset < 24) {
    return {
      advice: "Tibo already pressed it. Spend responsibly, or do not.",
      summary: `The latest Codex quota reset was confirmed ${shortAge(hoursSinceReset)} ago. The cooldown now outweighs the incident weather.`,
      title: "It already reset.",
    };
  }

  if (response.forecast.score >= 72) {
    return {
      advice: "Find a suspiciously token-hungry side project.",
      summary: "Operational pain is stacking up. Historically, this is reset-button weather.",
      title: "Use it or potentially lose it.",
    };
  }

  if (response.forecast.score >= 48) {
    return {
      advice: "Maybe stop hoarding. Keep a meaty task nearby.",
      summary: "There are enough signals to raise an eyebrow, but nothing is guaranteed.",
      title: "Worth a tactical token burn.",
    };
  }

  if (response.forecast.score >= 26) {
    return {
      advice: "Normal building conditions. Check Tibo before panic-spending.",
      summary: "Some signals are present, but the public data is not making a strong case yet.",
      title: "Do not force it.",
    };
  }

  return {
    advice: "Keep your tokens. The reset button is having a quiet afternoon.",
    summary: "The incident desk is quiet, or a reset happened too recently.",
    title: "Probably not today.",
  };
}

export function historyDetailMarkdown(entry: ForecastHistoryEntry): string {
  const sections = entry.changes.map((change) => {
    const source = change.details?.find((detail) => detail.action.trim().toLocaleLowerCase("en-US") === "source post");
    const explanations = (change.details ?? []).filter(
      (detail) => detail.action.trim().toLocaleLowerCase("en-US") !== "source post",
    );
    const delta = `${change.delta > 0 ? "+" : ""}${change.delta} pts`;
    const lines = [`## ${escapeMarkdown(change.label)}`, `**${escapeMarkdown(delta)}**`];

    if (source?.name) lines.push("### Source Post", sourcePostMarkdown(source.name));
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
