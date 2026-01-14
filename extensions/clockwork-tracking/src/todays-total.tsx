import { useState, useEffect } from "react";
import { List, Icon, showToast, Toast, ActionPanel, Action, getPreferenceValues, Color } from "@raycast/api";
import { getWorklogs } from "./api";
import { getTrackingState } from "./storage";
import { formatDuration, formatDate, getElapsedTime } from "./utils";
import { Worklog, TrackingState, Preferences } from "./types";

interface IssueGroup {
  issueKey: string;
  issueSummary: string;
  issueStatus?: string;
  totalSeconds: number;
}

function getStatusColor(status?: string): Color {
  if (!status) return Color.SecondaryText;
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("closed") || s.includes("resolved")) return Color.Green;
  if (s.includes("testing") || s.includes("review") || s.includes("qa")) return Color.Blue;
  if (s.includes("progress") || s.includes("development")) return Color.Yellow;
  return Color.SecondaryText;
}

function getStatusGroup(status?: string): string {
  if (!status) return "Other";
  const s = status.toLowerCase();
  if (s.includes("progress") || s.includes("development")) return "In Progress";
  if (s.includes("testing") || s.includes("review") || s.includes("qa")) return "Testing";
  if (s.includes("done") || s.includes("closed") || s.includes("resolved")) return "Done";
  if (s.includes("backlog")) return "Backlog";
  if (s.includes("to do") || s.includes("todo") || s.includes("open")) return "To Do";
  return status;
}

function getStatusOrder(group: string): number {
  const order: Record<string, number> = {
    "In Progress": 0,
    Testing: 1,
    "To Do": 2,
    Backlog: 3,
    Done: 4,
    Other: 5,
  };
  return order[group] ?? 99;
}

export default function Command() {
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [trackingState, setLocalTrackingState] = useState<TrackingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const today = formatDate(new Date());
      const [entries, state] = await Promise.all([getWorklogs(today, today), getTrackingState()]);
      setWorklogs(entries);
      setLocalTrackingState(state);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Data",
        message: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Group worklogs by issue
  const issueMap = new Map<string, IssueGroup>();
  for (const w of worklogs) {
    if (w.issueKey) {
      const existing = issueMap.get(w.issueKey);
      if (existing) {
        existing.totalSeconds += w.timeSpentSeconds;
      } else {
        issueMap.set(w.issueKey, {
          issueKey: w.issueKey,
          issueSummary: w.issueSummary || "",
          issueStatus: w.issueStatus,
          totalSeconds: w.timeSpentSeconds,
        });
      }
    }
  }

  // Group by status
  const grouped = new Map<string, IssueGroup[]>();
  for (const issue of issueMap.values()) {
    const group = getStatusGroup(issue.issueStatus);
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(issue);
  }

  // Sort groups and issues
  const sortedGroups = Array.from(grouped.entries())
    .sort(([a], [b]) => getStatusOrder(a) - getStatusOrder(b))
    .map(([name, issues]) => [name, issues.sort((a, b) => b.totalSeconds - a.totalSeconds)] as [string, IssueGroup[]]);

  const totalSeconds = worklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);
  const currentElapsed =
    trackingState?.isTracking && trackingState.startedAt ? getElapsedTime(trackingState.startedAt) : 0;
  const grandTotal = totalSeconds + currentElapsed;

  return (
    <List isLoading={isLoading}>
      {trackingState?.isTracking && trackingState.issueKey && (
        <List.Section title="Currently Tracking">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={trackingState.issueKey}
            subtitle={`${formatDuration(currentElapsed)} (not yet logged)`}
            accessories={[{ tag: { value: "Active", color: Color.Green } }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Issue" url={`${jiraBaseUrl}/browse/${trackingState.issueKey}`} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section
        title={`Today's Total: ${formatDuration(grandTotal)}`}
        subtitle={`Logged: ${formatDuration(totalSeconds)} | ${issueMap.size} issues`}
      />

      {sortedGroups.map(([groupName, issues]) => (
        <List.Section key={groupName} title={groupName} subtitle={`${issues.length} issues`}>
          {issues.map((issue) => (
            <List.Item
              key={issue.issueKey}
              icon={Icon.Document}
              title={`[${issue.issueKey}] ${issue.issueSummary || "No summary"}`}
              accessories={[
                issue.issueStatus
                  ? { tag: { value: issue.issueStatus, color: getStatusColor(issue.issueStatus) } }
                  : {},
                { text: formatDuration(issue.totalSeconds) },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Jira" url={`${jiraBaseUrl}/browse/${issue.issueKey}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {worklogs.length === 0 && !trackingState?.isTracking && !isLoading && (
        <List.EmptyView icon={Icon.Clock} title="No Time Logged Today" description="Start tracking to log time" />
      )}
    </List>
  );
}
