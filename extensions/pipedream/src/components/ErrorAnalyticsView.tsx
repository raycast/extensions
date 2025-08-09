import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useUserInfo } from "../hooks/useUserInfo";
import { SavedWorkflow, WorkflowError } from "../types";
import { fetchWorkflowErrors, fetchWorkflowErrorsForTrending } from "../services/api";
import { ErrorTrendingView } from "./ErrorTrendingView";
import { PIPEDREAM_ERROR_HISTORY_URL } from "../utils/constants";
import {
  categorizeError,
  determineSeverity,
  getErrorStatistics,
  formatErrorMessage,
  getErrorAge,
} from "../utils/error-management";
import { generateWeeklyErrorSummary } from "../utils/error-trending";

interface ErrorAnalyticsViewProps {
  workflow: SavedWorkflow;
  errors: WorkflowError[];
}

export function ErrorAnalyticsView({ workflow, errors }: ErrorAnalyticsViewProps) {
  const { orgId } = useUserInfo();
  const { push } = useNavigation();

  // Calculate error statistics
  const errorStats = getErrorStatistics(errors);
  const errorCategories = Object.entries(errorStats.categoryBreakdown).filter(([, count]) => count > 0);
  const errorTrendingSummary = generateWeeklyErrorSummary(errors);

  const hasErrors = errors.length > 0;

  return (
    <List navigationTitle={`Error Analytics: ${workflow.customName}`}>
      {/* Workflow Context */}
      <List.Section title="Workflow Overview">
        <List.Item
          title={workflow.customName}
          subtitle={`${workflow.triggerCount} triggers • ${workflow.stepCount} steps`}
          icon={Icon.Cog}
          accessories={[{ text: hasErrors ? `${errors.length >= 100 ? "100+" : errors.length} errors` : "No errors" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={workflow.url} title="Open Workflow in Pipedream" icon={Icon.Globe} />
              <Action.OpenInBrowser
                url={`${PIPEDREAM_ERROR_HISTORY_URL}${workflow.id}`}
                title="View Full Error History"
                icon={Icon.ExclamationMark}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {hasErrors ? (
        <>
          {/* Error Trending Analysis */}
          <List.Section title="Error Trending (7 Days)">
            <List.Item
              title="Error Trend Analysis"
              subtitle={`${errorTrendingSummary.totalErrors} total errors • ${errorTrendingSummary.trend.description}`}
              accessories={[
                { text: `${errorTrendingSummary.trend.indicator}` },
                { text: `Avg: ${errorTrendingSummary.dailyAverage.toFixed(1)}/day` },
              ]}
              icon={Icon.BarChart}
              actions={
                <ActionPanel>
                  <Action
                    title="View Detailed Trends"
                    icon={Icon.BarChart}
                    onAction={async () => {
                      try {
                        const enhancedErrors = await fetchWorkflowErrorsForTrending(workflow.id, orgId || "");
                        push(<ErrorTrendingView workflow={workflow} errors={enhancedErrors.data} />);
                      } catch {
                        push(<ErrorTrendingView workflow={workflow} errors={errors} />);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          {/* Error Categories */}
          {errorCategories.length > 0 && (
            <List.Section title="Error Categories">
              {errorCategories.map(([category, count]) => {
                const percentage = ((count / errors.length) * 100).toFixed(1);
                return (
                  <List.Item
                    key={category}
                    title={category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    subtitle={`${count} errors (${percentage}% of total)`}
                    accessories={[{ text: `${count}` }]}
                    icon={Icon.Tag}
                  />
                );
              })}
            </List.Section>
          )}

          {/* Error Severity Analysis */}
          <List.Section title="Error Severity Distribution">
            <List.Item
              title="Critical Errors"
              subtitle={`High-impact errors requiring immediate attention`}
              accessories={[
                {
                  text: `${
                    errors.filter((error) => {
                      const category = categorizeError(error);
                      const categoryErrors = errors.filter((e) => categorizeError(e) === category);
                      return determineSeverity(error, categoryErrors.length) === "critical";
                    }).length
                  }`,
                },
              ]}
              icon={Icon.Xmark}
            />
            <List.Item
              title="High Priority Errors"
              subtitle={`Errors that may impact workflow performance`}
              accessories={[
                {
                  text: `${
                    errors.filter((error) => {
                      const category = categorizeError(error);
                      const categoryErrors = errors.filter((e) => categorizeError(e) === category);
                      return determineSeverity(error, categoryErrors.length) === "high";
                    }).length
                  }`,
                },
              ]}
              icon={Icon.ExclamationMark}
            />
            <List.Item
              title="Medium & Low Priority"
              subtitle={`Less critical errors and warnings`}
              accessories={[
                {
                  text: `${
                    errors.filter((error) => {
                      const category = categorizeError(error);
                      const categoryErrors = errors.filter((e) => categorizeError(e) === category);
                      const severity = determineSeverity(error, categoryErrors.length);
                      return severity === "medium" || severity === "low";
                    }).length
                  }`,
                },
              ]}
              icon={Icon.Warning}
            />
          </List.Section>

          {/* Recent Error Events */}
          <List.Section title="Recent Error Events">
            {errors.slice(0, 10).map((error) => {
              const category = categorizeError(error);
              const categoryErrors = errors.filter((e) => categorizeError(e) === category);
              const severity = determineSeverity(error, categoryErrors.length);
              const errorAge = getErrorAge(error);

              return (
                <List.Item
                  key={error.id}
                  title={formatErrorMessage(error)}
                  subtitle={`${errorAge} • ${category} • ${severity}`}
                  icon={Icon.ExclamationMark}
                  accessories={[
                    {
                      text: severity,
                      icon:
                        severity === "critical"
                          ? Icon.Xmark
                          : severity === "high"
                            ? Icon.ExclamationMark
                            : severity === "medium"
                              ? Icon.Warning
                              : Icon.Info,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        content={`Error: ${formatErrorMessage(error)}\nMessage: ${error.event.error.msg}\nStack: ${error.event.error.stack}\nTimestamp: ${new Date(error.indexed_at_ms).toLocaleString()}\nWorkflow: ${workflow.customName} (${workflow.id})`}
                        title="Copy Error Log"
                        icon={Icon.Clipboard}
                      />
                      <Action.OpenInBrowser
                        url={`${PIPEDREAM_ERROR_HISTORY_URL}${workflow.id}`}
                        title="View in Pipedream"
                        icon={Icon.Globe}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      ) : (
        <List.Section title="No Errors">
          <List.Item
            title="No Recent Errors"
            subtitle="This workflow hasn't encountered any errors recently"
            icon={Icon.Checkmark}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={workflow.url} title="Open Workflow in Pipedream" icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Quick Actions */}
      <List.Section title="Quick Actions">
        <List.Item
          title="Refresh Error Data"
          subtitle="Fetch the latest error information"
          icon={Icon.RotateClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                onAction={async () => {
                  if (!orgId) return;
                  try {
                    showToast({ title: "Refreshing...", style: Toast.Style.Animated });
                    const errorHistory = await fetchWorkflowErrors(workflow.id, orgId);
                    push(<ErrorAnalyticsView workflow={workflow} errors={errorHistory.data} />);
                    showToast({ title: "Error data refreshed", style: Toast.Style.Success });
                  } catch (error) {
                    showToast({
                      title: "Error",
                      message: `Failed to refresh: ${error instanceof Error ? error.message : String(error)}`,
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
