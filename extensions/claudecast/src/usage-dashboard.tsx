import { Action, ActionPanel, Detail, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getTodayStats,
  getWeekStats,
  getMonthStats,
  getAllTimeStats,
  getDailyStats,
  formatCost,
  generateCostChart,
  generateProjectTable,
  UsageStats,
  DailyStats,
} from "./lib/usage-stats";

type TimeRange = "today" | "week" | "month" | "all";

export default function UsageDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  async function loadStats(range: TimeRange) {
    setIsLoading(true);

    let newStats: UsageStats;
    switch (range) {
      case "today":
        newStats = await getTodayStats();
        break;
      case "week":
        newStats = await getWeekStats();
        break;
      case "month":
        newStats = await getMonthStats();
        break;
      case "all":
        newStats = await getAllTimeStats();
        break;
    }

    const daily = await getDailyStats(7);

    setStats(newStats);
    setDailyStats(daily);
    setIsLoading(false);
  }

  useEffect(() => {
    loadStats(timeRange);
  }, [timeRange]);

  const timeRangeLabel = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    all: "All Time",
  }[timeRange];

  const markdown = stats
    ? generateDashboardMarkdown(stats, dailyStats, timeRangeLabel)
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={stats ? <StatsMetadata stats={stats} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Time Range">
            <Action
              title="Today"
              icon={timeRange === "today" ? Icon.Checkmark : Icon.Calendar}
              onAction={() => setTimeRange("today")}
            />
            <Action
              title="This Week"
              icon={timeRange === "week" ? Icon.Checkmark : Icon.Calendar}
              onAction={() => setTimeRange("week")}
            />
            <Action
              title="This Month"
              icon={timeRange === "month" ? Icon.Checkmark : Icon.Calendar}
              onAction={() => setTimeRange("month")}
            />
            <Action
              title="All Time"
              icon={timeRange === "all" ? Icon.Checkmark : Icon.Calendar}
              onAction={() => setTimeRange("all")}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => loadStats(timeRange)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function StatsMetadata({ stats }: { stats: UsageStats }) {
  // Sort projects by cost
  const topProjects = Object.entries(stats.sessionsByProject)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, 5);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Total Sessions"
        text={stats.totalSessions.toString()}
        icon={Icon.Message}
      />
      <Detail.Metadata.Label
        title="Total Cost"
        text={formatCost(stats.totalCost)}
        icon={Icon.Coins}
      />

      <Detail.Metadata.Separator />

      <Detail.Metadata.TagList title="Top Projects">
        {topProjects.map(([project, data]) => (
          <Detail.Metadata.TagList.Item
            key={project}
            text={`${project}: ${formatCost(data.cost)}`}
            color={Color.Blue}
          />
        ))}
      </Detail.Metadata.TagList>

      {stats.topSessions.length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Most Expensive Session"
            text={`${formatCost(stats.topSessions[0].cost)} - ${stats.topSessions[0].projectName}`}
            icon={Icon.Warning}
          />
        </>
      )}
    </Detail.Metadata>
  );
}

function generateDashboardMarkdown(
  stats: UsageStats,
  dailyStats: DailyStats[],
  timeRangeLabel: string,
): string {
  let md = `# Claude Code Usage - ${timeRangeLabel}\n\n`;

  // Summary stats
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Sessions | ${stats.totalSessions} |\n`;
  md += `| Total Cost | ${formatCost(stats.totalCost)} |\n`;
  md += `| Avg Cost/Session | ${formatCost(stats.totalSessions > 0 ? stats.totalCost / stats.totalSessions : 0)} |\n\n`;

  // Daily chart
  if (dailyStats.length > 0) {
    md += `## Daily Trend\n\n`;
    md += generateCostChart(dailyStats);
    md += "\n\n";
  }

  // Project breakdown
  if (Object.keys(stats.sessionsByProject).length > 0) {
    md += `## Cost by Project\n\n`;
    md += generateProjectTable(stats.sessionsByProject);
    md += "\n";
  }

  // Top expensive sessions
  if (stats.topSessions.length > 0) {
    md += `## Top Sessions by Cost\n\n`;
    md += `| Project | First Message | Cost |\n`;
    md += `|---------|---------------|------|\n`;

    for (const session of stats.topSessions.slice(0, 5)) {
      const preview = session.firstMessage
        ? session.firstMessage.slice(0, 40) +
          (session.firstMessage.length > 40 ? "..." : "")
        : "No message";
      md += `| ${session.projectName} | ${preview} | ${formatCost(session.cost)} |\n`;
    }
  }

  // Tips
  md += `\n---\n\n`;
  md += `*Tip: Use the action menu (⌘+K) to change the time range or refresh data.*\n`;

  return md;
}
