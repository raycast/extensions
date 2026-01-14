import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  Color,
} from "@raycast/api";
import { getWorklogs, startTimer, stopTimer } from "./api";
import {
  getTrackingState,
  setTrackingState,
  clearTrackingState,
  addRecentIssue,
  getCachedWorklogs,
  setCachedWorklogs,
  addRecentIssueWithSummary,
} from "./storage";
import { formatDuration, getDateRange, getElapsedTime } from "./utils";
import { Worklog, Preferences, DatePeriod, TrackingState } from "./types";

interface IssueGroup {
  issueKey: string;
  issueSummary: string;
  issueStatus?: string;
  totalSeconds: number;
}

const PERIODS: { id: DatePeriod; title: string }[] = [
  { id: "last-7-days", title: "Last 7 Days" },
  { id: "today", title: "Today" },
  { id: "yesterday", title: "Yesterday" },
  { id: "this-week", title: "This Week" },
  { id: "this-month", title: "This Month" },
];

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
  const [period, setPeriod] = useState<DatePeriod>("last-7-days");
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingState, setLocalTrackingState] = useState<TrackingState | null>(null);
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setIsLoading(true);
    const [cached, state] = await Promise.all([getCachedWorklogs(period), getTrackingState()]);
    if (cached && cached.length > 0) {
      setWorklogs(cached);
    }
    setLocalTrackingState(state);

    try {
      const entries = await fetchWorklogs();
      setWorklogs(entries);
      await setCachedWorklogs(period, entries);

      const seen = new Set<string>();
      for (const entry of entries) {
        if (entry.issueKey && !seen.has(entry.issueKey)) {
          seen.add(entry.issueKey);
          await addRecentIssueWithSummary(entry.issueKey, entry.issueSummary || "", entry.issueStatus);
        }
      }
    } catch (error) {
      if (!cached || cached.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Worklogs",
          message: error instanceof Error ? error.message : "An error occurred",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchWorklogs(): Promise<Worklog[]> {
    const { start, end } = getDateRange(period);
    return getWorklogs(start, end);
  }

  async function handleStartTracking(issueKey: string) {
    try {
      if (trackingState?.isTracking && trackingState.issueKey) {
        await stopTimer(trackingState.issueKey);
      }

      await startTimer(issueKey);
      const newState: TrackingState = {
        isTracking: true,
        issueKey,
        startedAt: new Date().toISOString(),
      };
      await setTrackingState(newState);
      await addRecentIssue(issueKey);
      setLocalTrackingState(newState);

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: `Now tracking ${issueKey}`,
      });

      try {
        await launchCommand({ name: "menu-bar", type: LaunchType.Background });
      } catch {
        // Menu bar refresh is optional
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Start Timer",
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }

  async function handleStopTracking() {
    if (!trackingState?.issueKey) return;

    try {
      await stopTimer(trackingState.issueKey);
      await clearTrackingState();
      setLocalTrackingState({ isTracking: false, issueKey: null, startedAt: null });

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Stopped",
      });

      await loadData();

      try {
        await launchCommand({ name: "menu-bar", type: LaunchType.Background });
      } catch {
        // Menu bar refresh is optional
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Stop Timer",
        message: error instanceof Error ? error.message : "An error occurred",
      });
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

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Period" value={period} onChange={(val) => setPeriod(val as DatePeriod)}>
          {PERIODS.map((p) => (
            <List.Dropdown.Item key={p.id} title={p.title} value={p.id} />
          ))}
        </List.Dropdown>
      }
    >
      {trackingState?.isTracking && trackingState.issueKey && (
        <List.Section title="Currently Tracking">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={trackingState.issueKey}
            subtitle={formatDuration(currentElapsed)}
            accessories={[{ tag: { value: "Active", color: Color.Green } }]}
            actions={
              <ActionPanel>
                <Action title="Stop Tracking" icon={Icon.Stop} onAction={handleStopTracking} />
                <Action.OpenInBrowser title="Open Issue" url={`${jiraBaseUrl}/browse/${trackingState.issueKey}`} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title={`Total: ${formatDuration(totalSeconds)}`} subtitle={`${issueMap.size} issues`} />

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
                trackingState?.issueKey === issue.issueKey ? { tag: { value: "Active", color: Color.Green } } : {},
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Tracking"
                    icon={Icon.Play}
                    onAction={() => handleStartTracking(issue.issueKey)}
                  />
                  <Action.OpenInBrowser title="Open in Jira" url={`${jiraBaseUrl}/browse/${issue.issueKey}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {worklogs.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Time Entries"
          description={`No worklogs found for ${PERIODS.find((p) => p.id === period)?.title.toLowerCase()}`}
        />
      )}
    </List>
  );
}
