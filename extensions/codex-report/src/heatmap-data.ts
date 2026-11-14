import { calendarDate } from "./periods";
import { Agent, AgentSelection, CostSummary, Metric, Report } from "./report-data";

export type HeatmapView = "daily" | "weekly";
export type HeatmapPeriod = "sixMonths" | "year";
export type HeatmapRange = { from: string; to: string; title: string };
export type HeatmapCell = {
  date: string;
  week: number;
  weekday: number;
  inRange: boolean;
  value: number;
  cost: CostSummary;
  dominantAgent?: Agent | "tie";
  contributions: Report["agentDays"];
};
export type Heatmap = {
  cells: HeatmapCell[];
  weeks: number;
  thresholds: number[];
  metric: Metric;
  agent: AgentSelection;
  range: HeatmapRange;
};

export function heatmapRange(period: HeatmapPeriod, offset: number, now = new Date()): HeatmapRange {
  if (period === "year") {
    const year = now.getFullYear() + offset;
    const start = new Date(year, 0, 1, 12);
    const end = new Date(year, 11, 31, 12);
    return { from: calendarDate(start), to: calendarDate(end), title: `${year} Activity` };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 5 + offset * 6, 1, 12);
  const end = offset === 0 ? now : new Date(start.getFullYear(), start.getMonth() + 6, 0, 12);
  return { from: calendarDate(start), to: calendarDate(end), title: "6 Months of Activity" };
}

export function metricValue(activity: Report["days"][number] | undefined, metric: Metric): number {
  if (!activity) return 0;
  return metric === "costs" ? activity.cost.totalCost : activity[metric];
}

export function dominantAgent(entries: Report["agentDays"], metric: Metric): HeatmapCell["dominantAgent"] {
  const peak = Math.max(0, ...entries.map((entry) => metricValue(entry, metric)));
  if (peak === 0) return undefined;
  const winners = entries.filter((entry) => metricValue(entry, metric) === peak);
  return winners.length > 1 ? "tie" : winners[0].agent;
}

export function sumCosts(entries: { cost: CostSummary }[]): CostSummary {
  return entries.reduce(
    (sum, entry) => ({
      totalCost: sum.totalCost + entry.cost.totalCost,
      pricedTokens: sum.pricedTokens + entry.cost.pricedTokens,
      unpricedTokens: sum.unpricedTokens + entry.cost.unpricedTokens,
    }),
    { totalCost: 0, pricedTokens: 0, unpricedTokens: 0 },
  );
}

export function heatmapLevel(value: number, thresholds: number[]): number {
  if (value <= 0) return 0;
  const index = thresholds.findIndex((threshold) => value <= threshold);
  return index < 0 ? 4 : index + 1;
}

export function buildHeatmap(report: Report, range: HeatmapRange, agent: AgentSelection, metric: Metric): Heatmap {
  const totals = new Map(report.days.map((entry) => [entry.date, entry]));
  const contributions = new Map<string, Report["agentDays"]>();
  for (const entry of report.agentDays) {
    const daily = contributions.get(entry.date) ?? [];
    daily.push(entry);
    contributions.set(entry.date, daily);
  }
  // All-agent thresholds stay fixed when the visible agent changes. Four geometric
  // levels keep lower-volume days visible without letting one peak set a flat scale.
  const peak = Math.max(
    0,
    ...report.days
      .filter((entry) => entry.date >= range.from && entry.date <= range.to)
      .map((entry) => metricValue(entry, metric)),
  );
  const thresholds = [peak / 64, peak / 16, peak / 4, peak];
  const cursor = new Date(`${range.from}T12:00:00`);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const last = new Date(`${range.to}T12:00:00`);
  last.setDate(last.getDate() + ((7 - last.getDay()) % 7));
  const cells: HeatmapCell[] = [];
  while (cursor <= last) {
    const date = calendarDate(cursor);
    const daily = contributions.get(date) ?? [];
    const visible = agent === "all" ? daily : daily.filter((entry) => entry.agent === agent);
    cells.push({
      date,
      week: Math.floor(cells.length / 7),
      weekday: cells.length % 7,
      inRange: date >= range.from && date <= range.to,
      value:
        agent === "all"
          ? metricValue(totals.get(date), metric)
          : visible.reduce((sum, entry) => sum + metricValue(entry, metric), 0),
      cost: sumCosts(visible),
      dominantAgent: dominantAgent(visible, metric),
      contributions: daily,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return { cells, weeks: cells.length / 7, thresholds, metric, agent, range };
}
