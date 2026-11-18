import { splitModelName } from "./families";
import { formatRank } from "./format";
import { isPriceMetric, METRICS } from "./metrics";
import type { RankedModel } from "./models";
import type { Standing } from "./standings";

/** Escapes API text so it renders literally in Raycast markdown, including inside table cells. */
export function escapeMarkdown(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}[\]<>!|#$]/g, "\\$&");
}

function notes(standings: Standing[]): string {
  const shown = new Set(standings.map(({ metric }) => metric));
  return [
    shown.has("inputPrice") || shown.has("outputPrice") ? "Prices are USD per 1M tokens." : "",
    shown.has("speed") || shown.has("latency") ? "Speed and latency are medians across providers." : "",
    "Ranks compare all evaluated configurations.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Model details: name and provider, the active metric as a headline, and every shown metric with its rank. */
export function modelDetailsMarkdown(model: RankedModel, standings: Standing[], warning?: string): string {
  const definition = METRICS[model.metric];
  const { family, qualifiers } = splitModelName(model.name);
  const total = standings.find(({ metric }) => metric === model.metric)?.total;
  const table = [
    "| Metric | Value | Rank |",
    "| :--- | ---: | ---: |",
    ...standings.map((standing) => {
      const cells = [
        METRICS[standing.metric].title,
        escapeMarkdown(METRICS[standing.metric].format(standing.value)),
        standing.rank === undefined ? "—" : formatRank(standing.rank, standing.total),
      ];
      return `| ${(standing.metric === model.metric ? cells.map((cell) => `**${cell}**`) : cells).join(" | ")} |`;
    }),
  ].join("\n");
  return [
    `# ${escapeMarkdown(family)}`,
    [model.creator, ...qualifiers].map(escapeMarkdown).join(" · "),
    `## ${escapeMarkdown(definition.format(model.value))}`,
    `**${definition.title}**${isPriceMetric(model.metric) ? " per 1M tokens" : ""} · #${model.rank}${total ? ` of ${total}` : ""}`,
    table,
    notes(standings),
    warning ? `> ${escapeMarkdown(warning)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
