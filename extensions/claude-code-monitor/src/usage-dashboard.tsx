import { Detail, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getAllStats,
  formatCost,
  generateCostChart,
  generateProjectTable,
  generateModelTable,
} from "./lib/usage-stats";
import {
  formatUtilization,
  formatResetTime,
  generateQuotaBar,
} from "./lib/plan-usage";
import { usePlanUsage } from "./hooks/usePlanUsage";
import { formatTokens } from "./lib/pricing";
import { UsageStats, DailyStats, PlanUsageData } from "./types";

function utilizationColor(util: number): Color {
  if (util >= 80) return Color.Red;
  if (util >= 50) return Color.Orange;
  return Color.Green;
}

export default function UsageDashboardCommand() {
  const { data, isLoading, revalidate, error } = useCachedPromise(() =>
    getAllStats(7),
  );
  const { planUsage, revalidate: revalidatePlan } = usePlanUsage();

  const markdown = data
    ? buildDashboardMarkdown(data, planUsage)
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
            {planUsage?.fiveHour != null && (
              <Detail.Metadata.TagList title="5h Window">
                <Detail.Metadata.TagList.Item
                  text={formatUtilization(planUsage.fiveHour.utilization)}
                  color={utilizationColor(planUsage.fiveHour.utilization)}
                />
              </Detail.Metadata.TagList>
            )}
            {planUsage?.sevenDay != null && (
              <Detail.Metadata.TagList title="7d Window">
                <Detail.Metadata.TagList.Item
                  text={formatUtilization(planUsage.sevenDay.utilization)}
                  color={utilizationColor(planUsage.sevenDay.utilization)}
                />
              </Detail.Metadata.TagList>
            )}
            {planUsage && <Detail.Metadata.Separator />}
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
            onAction={() => {
              revalidate();
              revalidatePlan();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function buildDashboardMarkdown(
  data: {
    today: UsageStats;
    week: UsageStats;
    month: UsageStats;
    daily: DailyStats[];
  },
  planUsage: PlanUsageData | null,
): string {
  let md = "# Claude Code Usage Dashboard\n\n";

  // Plan Quota
  if (planUsage && (planUsage.fiveHour || planUsage.sevenDay)) {
    md += "## Plan Quota\n\n";
    md += "```\n";
    if (planUsage.fiveHour) {
      const reset5h = formatResetTime(planUsage.fiveHour.resets_at);
      const resetStr = reset5h ? ` (resets in ${reset5h})` : "";
      md += `5h  \u2502${generateQuotaBar(planUsage.fiveHour.utilization)}\u2502 ${formatUtilization(planUsage.fiveHour.utilization)}${resetStr}\n`;
    }
    if (planUsage.sevenDay) {
      const reset7d = formatResetTime(planUsage.sevenDay.resets_at);
      const resetStr = reset7d ? ` (resets in ${reset7d})` : "";
      md += `7d  \u2502${generateQuotaBar(planUsage.sevenDay.utilization)}\u2502 ${formatUtilization(planUsage.sevenDay.utilization)}${resetStr}\n`;
    }
    md += "```\n\n";
  }

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
