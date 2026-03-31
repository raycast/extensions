import { Detail } from "@raycast/api";
import { ScheduleStats, formatHoursMinutes } from "../stats-utils";
import { DAYS_OF_WEEK } from "../constants";

interface StatisticsViewProps {
  stats: ScheduleStats;
  groupName: string;
}

export function StatisticsView({ stats, groupName }: StatisticsViewProps) {
  const markdown = `
# ${groupName}

## Overview

| Metric | Value |
|---|---|
| Total Courses | ${stats.totalCourses} |
| Total Units | ${stats.totalUnits} |
| Ephemeral Courses | ${stats.ephemeralCount} |
| Total Weekly Hours | ${formatHoursMinutes(stats.totalWeeklyMinutes)} |
| Busiest Day | ${stats.busiestDay ?? "N/A"} |
| Avg Hours per Active Day | ${formatHoursMinutes(Math.round(stats.averageDailyMinutes))} |
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Schedule Statistics"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Total Courses" text={String(stats.totalCourses)} />
          <Detail.Metadata.Label title="Total Units" text={String(stats.totalUnits)} />
          <Detail.Metadata.Label title="Weekly Hours" text={formatHoursMinutes(stats.totalWeeklyMinutes)} />
          {stats.busiestDay && <Detail.Metadata.Label title="Busiest Day" text={stats.busiestDay} />}
          <Detail.Metadata.Separator />
          {DAYS_OF_WEEK.filter((d) => stats.minutesPerDay[d] > 0).map((d) => (
            <Detail.Metadata.Label key={d} title={d} text={formatHoursMinutes(stats.minutesPerDay[d])} />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
