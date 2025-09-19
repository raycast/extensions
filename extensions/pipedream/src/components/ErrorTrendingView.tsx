import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SavedWorkflow, WorkflowError } from "../types";
import {
  generateWeeklyErrorSummary,
  formatDateForDisplay,
  generateTextBarChart,
  groupErrorsByDayWithCoverage,
} from "../utils/error-trending";
import { useMemo } from "react";

export interface ErrorTrendingViewProps {
  workflow: SavedWorkflow;
  errors: WorkflowError[];
}

export function ErrorTrendingView({ workflow, errors }: ErrorTrendingViewProps) {
  const summary = useMemo(() => generateWeeklyErrorSummary(errors), [errors]);
  const coverage = useMemo(() => groupErrorsByDayWithCoverage(errors), [errors]);
  const barChart = useMemo(() => generateTextBarChart(coverage.dailyCounts), [coverage.dailyCounts]);

  const coverageTitle = coverage.hasFullCoverage
    ? "Full 7-Day Coverage"
    : `Limited Coverage (${coverage.daysWithData} of ${coverage.coverageDays} days)`;

  const coverageSubtitle = coverage.hasFullCoverage
    ? "Complete data for all 7 days"
    : `Displaying data for ${coverage.daysWithData} days with errors within a ${coverage.coverageDays}-day period.`;

  return (
    <List navigationTitle={`Error Trends: ${workflow.customName}`}>
      <List.Section title="Data Coverage">
        <List.Item
          title={coverageTitle}
          subtitle={coverageSubtitle}
          accessories={[
            {
              icon: coverage.hasFullCoverage ? Icon.Checkmark : Icon.Warning,
              text: coverage.hasFullCoverage ? "Complete" : "Limited",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Coverage Info"
                content={`${workflow.customName} - ${coverageTitle}: ${coverageSubtitle}`}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Error Summary">
        <List.Item
          title={coverage.hasFullCoverage ? "Total Errors (7 days)" : `Total Errors (${coverage.coverageDays} days)`}
          subtitle={`${summary.totalErrors} errors`}
          accessories={[{ text: `${summary.trend.indicator} ${summary.trend.description}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Summary"
                content={`${workflow.customName} - ${summary.totalErrors} errors in ${coverage.coverageDays} days (${summary.trend.description})`}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Daily Average"
          subtitle={`${summary.dailyAverage.toFixed(1)} errors per day`}
          accessories={[{ icon: Icon.Calendar }]}
        />

        <List.Item
          title="Peak Day"
          subtitle={`${formatDateForDisplay(summary.peakDay.date)} - ${summary.peakDay.count} errors`}
          accessories={[{ icon: Icon.ChevronUp }]}
        />
      </List.Section>

      <List.Section title={coverage.hasFullCoverage ? "7-Day Error Chart" : `${coverage.coverageDays}-Day Error Chart`}>
        <List.Item
          title="Error Distribution"
          subtitle="Visual representation of daily error counts"
          accessories={[{ text: summary.trend.indicator }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Chart" content={barChart} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Daily Breakdown">
        {coverage.dailyCounts.map((day) => (
          <List.Item
            key={day.date}
            title={formatDateForDisplay(day.date)}
            subtitle={`${day.count} errors`}
            accessories={[
              { text: day.count > 0 ? `${day.count}` : "0" },
              { icon: day.count > 0 ? Icon.ExclamationMark : Icon.Checkmark },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Day Info"
                  content={`${formatDateForDisplay(day.date)}: ${day.count} errors`}
                />
                {day.errors.length > 0 && (
                  <Action.CopyToClipboard
                    title="Copy Error Details"
                    content={day.errors
                      .map(
                        (error) =>
                          `${new Date(error.indexed_at_ms).toLocaleTimeString()}: ${error.event?.error?.msg || "Unknown error"}`,
                      )
                      .join("\n")}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Chart View">
        <List.Item
          title="Text Chart"
          subtitle="7-day error distribution"
          accessories={[{ text: `Max: ${Math.max(...summary.dailyCounts.map((d) => d.count))}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Full Chart"
                content={`${workflow.customName} - 7-Day Error Trend\n\n${barChart}\n\nTotal: ${summary.totalErrors} errors\nTrend: ${summary.trend.description}`}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
