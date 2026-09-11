import type { DayStatus } from "@/types";

const LEVEL_COLOR: Record<DayStatus["level"], string> = {
  operational: "#3fb950",
  degraded: "#e3b341",
  partial: "#f0883e",
  major: "#f85149",
  unknown: "#6e7681",
};

export function calcUptimePercent(days: DayStatus[]): number {
  if (days.length === 0) {
    return 100;
  }

  const operational = days.filter((d) => d.level === "operational").length;
  return (operational / days.length) * 100;
}

export function resolveUptimePercent(
  days: DayStatus[] | undefined,
  uptimePercent?: number,
): number | null {
  if (uptimePercent !== undefined && !Number.isNaN(uptimePercent)) {
    return uptimePercent;
  }

  if (!days?.length) {
    return null;
  }

  return calcUptimePercent(days);
}

export function averageComponentUptime(
  components: Array<{ uptimePercent?: number; historyDays?: DayStatus[] }>,
): number | undefined {
  const values = components
    .map((component) => {
      if (
        component.uptimePercent !== undefined &&
        !Number.isNaN(component.uptimePercent)
      ) {
        return component.uptimePercent;
      }

      if (component.historyDays?.length) {
        return calcUptimePercent(component.historyDays);
      }

      return undefined;
    })
    .filter((value): value is number => value !== undefined);

  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregatePageDayLevel(
  levels: DayStatus["level"][],
): DayStatus["level"] {
  const affected = levels.filter((level) => level !== "operational").length;
  const ratio = affected / levels.length;

  if (ratio === 0) {
    return "operational";
  }
  if (ratio < 0.3) {
    return "degraded";
  }
  if (ratio < 0.6) {
    return "partial";
  }
  return "major";
}

export function buildPageHistoryFromComponents(
  components: Array<{ historyDays?: DayStatus[] }>,
): DayStatus[] {
  const histories = components
    .map((component) => component.historyDays ?? [])
    .filter((history) => history.length > 0);

  if (histories.length === 0) {
    return [];
  }

  const levelsByDate = new Map<string, DayStatus["level"][]>();

  for (const history of histories) {
    for (const day of history) {
      const levels = levelsByDate.get(day.date) ?? [];
      levels.push(day.level);
      levelsByDate.set(day.date, levels);
    }
  }

  return Array.from(levelsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, levels]) => ({
      date,
      level: aggregatePageDayLevel(levels),
    }));
}

export function buildUptimeChartMarkdown(
  days: DayStatus[],
  width = 540,
  height = 32,
): string {
  if (days.length === 0) {
    return "";
  }

  const gap = 2;
  const barWidth = (width - gap * (days.length - 1)) / days.length;
  const radius = 2;

  const rects = days
    .map((day, index) => {
      const x = index * (barWidth + gap);
      const color = LEVEL_COLOR[day.level];
      return `<rect x="${x.toFixed(1)}" y="0" width="${barWidth.toFixed(1)}" height="${height}" rx="${radius}" fill="${color}" />`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects}</svg>`;
  const base64 = Buffer.from(svg).toString("base64");

  return `![uptime chart](data:image/svg+xml;base64,${base64})`;
}

export function buildUptimeDetailMarkdown(
  days: DayStatus[] | undefined,
  uptimePercent?: number,
): string | undefined {
  if (!days?.length) {
    return undefined;
  }

  const chart = buildUptimeChartMarkdown(days);
  const uptime = resolveUptimePercent(days, uptimePercent);
  const dayCount = days.length;

  if (uptime === null) {
    return chart;
  }

  return [
    chart,
    `Past ${dayCount} days — **${uptime.toFixed(2)}% uptime**`,
  ].join("\n\n");
}
