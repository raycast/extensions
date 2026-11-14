import type { Agent, AgentSelection, Metric, Report } from "./report-data";
import { Heatmap, HeatmapCell, metricValue, sumCosts } from "./heatmap-data";

export type HeatmapWeek = Pick<HeatmapCell, "date" | "value" | "cost" | "contributions"> & {
  endDate: string;
  week: number;
  totalValue: number;
};
export type WeeklyHeatmap = { weeks: HeatmapWeek[]; peak: number };

function weeklyContributions(days: HeatmapCell[]): Report["agentDays"] {
  const totals = new Map<Agent, Report["agentDays"][number]>();
  for (const entry of days.flatMap((day) => day.contributions)) {
    const total = totals.get(entry.agent) ?? {
      date: days[0].date,
      agent: entry.agent,
      tokens: 0,
      messages: 0,
      cost: { totalCost: 0, pricedTokens: 0, unpricedTokens: 0 },
    };
    total.tokens += entry.tokens;
    total.messages += entry.messages;
    total.cost = sumCosts([total, entry]);
    totals.set(entry.agent, total);
  }
  return [...totals.values()];
}

/** Boundary weeks include only dates inside the selected window. */
export function buildWeeklyHeatmap(map: Heatmap): WeeklyHeatmap {
  const weeks: HeatmapWeek[] = [];
  for (let week = 0; week < map.weeks; week++) {
    const days = map.cells.slice(week * 7, week * 7 + 7).filter((day) => day.inRange);
    if (!days.length) continue;
    const contributions = weeklyContributions(days);
    const visible = map.agent === "all" ? contributions : contributions.filter((entry) => entry.agent === map.agent);
    weeks.push({
      week,
      date: days[0].date,
      endDate: days[days.length - 1].date,
      value: days.reduce((sum, day) => sum + day.value, 0),
      totalValue: contributions.reduce((sum, entry) => sum + metricValue(entry, map.metric), 0),
      cost: sumCosts(visible),
      contributions,
    });
  }
  return { weeks, peak: Math.max(0, ...weeks.map((week) => week.totalValue)) };
}

export function weeklyHeight(value: number, peak: number): number {
  return value > 0 && peak > 0 ? Math.min(7, Math.ceil(Math.sqrt(value / peak) * 7)) : 0;
}

/** Whole blocks approximate shares; keep each agent in one contiguous segment. */
export function weeklyBlocks(week: HeatmapWeek, peak: number, agent: AgentSelection, metric: Metric): Agent[] {
  const height = weeklyHeight(week.value, peak);
  if (agent !== "all") return Array<Agent>(height).fill(agent);
  const codex = week.contributions.find((entry) => entry.agent === "codex");
  const codexBlocks = week.value > 0 ? Math.round((height * metricValue(codex, metric)) / week.value) : 0;
  return [...Array<Agent>(codexBlocks).fill("codex"), ...Array<Agent>(height - codexBlocks).fill("claude")];
}
