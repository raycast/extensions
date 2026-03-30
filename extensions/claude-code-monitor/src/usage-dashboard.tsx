import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getAllStats,
  formatCost,
  generateCostChart,
  generateProjectTable,
  generateModelTable,
} from "./lib/usage-stats";
import { formatTokens } from "./lib/pricing";
import { UsageStats, DailyStats } from "./types";

export default function UsageDashboardCommand() {
  const { data, isLoading, revalidate, error } = useCachedPromise(() =>
    getAllStats(7),
  );

  const markdown = data
    ? buildDashboardMarkdown(data)
    : error
      ? "# Failed to Load\n\nCould not load usage data. Press Cmd+R to retry."
      : "Loading usage data...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Today Sessions"
              text={`${data.today.totalSessions}`}
            />
            <Detail.Metadata.Label
              title="Today Cost"
              text={formatCost(data.today.totalCost)}
            />
            <Detail.Metadata.Label
              title="Today Tokens"
              text={`${formatTokens(data.today.totalInputTokens + data.today.totalOutputTokens)}`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Week Sessions"
              text={`${data.week.totalSessions}`}
            />
            <Detail.Metadata.Label
              title="Week Cost"
              text={formatCost(data.week.totalCost)}
            />
            <Detail.Metadata.Label
              title="Week Tokens"
              text={`${formatTokens(data.week.totalInputTokens + data.week.totalOutputTokens)}`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Month Sessions"
              text={`${data.month.totalSessions}`}
            />
            <Detail.Metadata.Label
              title="Month Cost"
              text={formatCost(data.month.totalCost)}
            />
            <Detail.Metadata.Label
              title="Month Tokens"
              text={`${formatTokens(data.month.totalInputTokens + data.month.totalOutputTokens)}`}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => revalidate()}
          />
        </ActionPanel>
      }
    />
  );
}

function buildDashboardMarkdown(data: {
  today: UsageStats;
  week: UsageStats;
  month: UsageStats;
  daily: DailyStats[];
}): string {
  let md = "# Claude Code Usage Dashboard\n\n";

  // Overview
  md += "## Overview\n\n";
  md += `| Period | Sessions | Est. Cost | Input Tokens | Output Tokens |\n`;
  md += `|--------|----------|-----------|--------------|---------------|\n`;
  md += `| Today | ${data.today.totalSessions} | ${formatCost(data.today.totalCost)} | ${formatTokens(data.today.totalInputTokens)} | ${formatTokens(data.today.totalOutputTokens)} |\n`;
  md += `| This Week | ${data.week.totalSessions} | ${formatCost(data.week.totalCost)} | ${formatTokens(data.week.totalInputTokens)} | ${formatTokens(data.week.totalOutputTokens)} |\n`;
  md += `| This Month | ${data.month.totalSessions} | ${formatCost(data.month.totalCost)} | ${formatTokens(data.month.totalInputTokens)} | ${formatTokens(data.month.totalOutputTokens)} |\n\n`;

  // Daily chart
  md += "## Daily Trend\n\n";
  md += generateCostChart(data.daily);
  md += "\n\n";

  // Model breakdown
  if (Object.keys(data.week.modelBreakdown).length > 0) {
    md += "## Model Usage (This Week)\n\n";
    md += generateModelTable(data.week.modelBreakdown);
    md += "\n\n";
  }

  // Project breakdown
  md += "## Project Breakdown (This Week)\n\n";
  md += generateProjectTable(data.week.sessionsByProject);
  md += "\n";

  return md;
}
