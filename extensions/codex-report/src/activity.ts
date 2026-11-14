import type { Bar } from "./charts";
import { Report, Metric, costLabel, money, agentColors, agentLabels } from "./report-data";

export function activityBars(dates: string[], report: Report, metric: Metric, groupWeeks: boolean): Bar[] {
  return dates.map((date, index) => {
    // Parse at local noon to keep weekday labels independent of UTC offsets.
    const localDate = new Date(`${date}T12:00:00`);
    const weekday = localDate.toLocaleDateString("en-US", { weekday: "short" });
    let group: string | undefined;
    if (groupWeeks && (index === 0 || localDate.getDay() === 1)) {
      const monday = new Date(localDate);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      group = `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    const activity = report.days.find((entry) => entry.date === date);
    return {
      label: `${date.slice(5, 7)}/${date.slice(8)}`,
      weekday,
      value: metricValue(activity, metric),
      displayValue: metric === "costs" ? dailyCostLabel(activity) : undefined,
      group,
      segments: report.selectedAgents.map((agent) => {
        const contribution = report.agentDays.find((entry) => entry.date === date && entry.agent === agent);
        return {
          label: agentLabels[agent],
          color: agentColors[agent],
          value: metricValue(contribution, metric),
        };
      }),
    };
  });
}

function metricValue(activity: Report["days"][number] | undefined, metric: Metric): number {
  if (!activity) return 0;
  return metric === "costs" ? activity.cost.totalCost : activity[metric];
}

function dailyCostLabel(activity: Report["days"][number] | undefined): string {
  return activity ? costLabel(activity.cost) : money(0);
}
