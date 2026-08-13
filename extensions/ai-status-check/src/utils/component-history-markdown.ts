import type { ComponentHistory, ComponentHistoryLevel } from "../domain/types";

const LEVEL_COLOR: Readonly<Record<ComponentHistoryLevel, string>> = {
  operational: "#34C759",
  informational: "#0A84FF",
  maintenance: "#8E8E93",
  degraded: "#FFD60A",
  partial_outage: "#FF9F0A",
  major_outage: "#FF453A",
  not_monitored: "#636366",
  unknown: "#636366",
};

export function buildComponentHistoryMarkdown(history: ComponentHistory | undefined): string | undefined {
  if (!history?.days.length) return undefined;
  const chart = buildComponentHistoryChart(history);
  const summary =
    history.uptimePercent === undefined
      ? `Past ${history.windowDays} days — ${history.basis === "incidents" ? "incident history" : "availability history"}`
      : `Past ${history.windowDays} days — **${formatUptimePercent(history.uptimePercent, history.uptimeText)} uptime**`;
  return `${chart}\n\n${summary}`;
}

export function buildComponentHistoryChart(history: ComponentHistory, width = 540, height = 32): string {
  const days = history.days;
  if (days.length === 0) return "";
  const gap = 2;
  const barWidth = Math.max(1, (width - gap * (days.length - 1)) / days.length);
  const rectangles = days
    .map((day, index) => {
      const x = index * (barWidth + gap);
      return `<rect x="${x.toFixed(1)}" y="0" width="${barWidth.toFixed(1)}" height="${height}" rx="2" fill="${LEVEL_COLOR[day.level]}"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rectangles}</svg>`;
  return `![Component status history](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}

export function formatUptimePercent(value: number | undefined, sourceText?: string): string | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (sourceText) return sourceText;
  return `${Number(value.toFixed(6))}%`;
}
