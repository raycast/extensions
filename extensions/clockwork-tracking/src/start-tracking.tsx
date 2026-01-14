import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  popToRoot,
  launchCommand,
  LaunchType,
  confirmAlert,
  Alert,
  getPreferenceValues,
  Color,
} from "@raycast/api";
import { startTimer, stopTimer, getWorklogs } from "./api";
import {
  getTrackingState,
  setTrackingState,
  addRecentIssue,
  getRecentIssuesWithSummary,
  RecentIssue,
  addRecentIssueWithSummary,
} from "./storage";
import { extractIssueKey, formatDuration, getElapsedTime, formatDate } from "./utils";
import { TrackingState, Preferences } from "./types";

function getStatusColor(status?: string): Color {
  if (!status) return Color.SecondaryText;
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("closed") || s.includes("resolved")) return Color.Green;
  if (s.includes("testing") || s.includes("review") || s.includes("qa")) return Color.Blue;
  if (s.includes("progress") || s.includes("development")) return Color.Yellow;
  if (s.includes("backlog") || s.includes("to do") || s.includes("todo") || s.includes("open"))
    return Color.SecondaryText;
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
  const [isLoading, setIsLoading] = useState(true);
  const [currentState, setCurrentState] = useState<TrackingState | null>(null);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [searchText, setSearchText] = useState("");
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);

    // Load cached data first for instant display
    const [state, cached] = await Promise.all([getTrackingState(), getRecentIssuesWithSummary()]);
    setCurrentState(state);
    if (cached.length > 0) {
      setRecentIssues(cached);
    }

    // Fetch fresh worklogs to get latest issues with status
    try {
      const today = formatDate(new Date());
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const worklogs = await getWorklogs(formatDate(sevenDaysAgo), today);

      // Build unique issues list with aggregated time
      const issueMap = new Map<string, RecentIssue>();
      for (const w of worklogs) {
        if (w.issueKey) {
          const existing = issueMap.get(w.issueKey);
          if (existing) {
            existing.totalSeconds = (existing.totalSeconds || 0) + w.timeSpentSeconds;
          } else {
            issueMap.set(w.issueKey, {
              issueKey: w.issueKey,
              issueSummary: w.issueSummary || "",
              status: w.issueStatus,
              totalSeconds: w.timeSpentSeconds,
            });
          }
        }
      }

      const issues = Array.from(issueMap.values());
      setRecentIssues(issues);
    } catch (error) {
      // Keep cached data on error
      console.error("Failed to fetch fresh data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartTracking(issueKey: string, summary?: string, status?: string) {
    try {
      if (currentState?.isTracking && currentState.issueKey && currentState.issueKey !== issueKey) {
        const elapsed = currentState.startedAt ? getElapsedTime(currentState.startedAt) : 0;
        const confirmed = await confirmAlert({
          title: "Switch Issue?",
          message: `Currently tracking ${currentState.issueKey} (${formatDuration(elapsed)}). Switch to ${issueKey}?`,
          primaryAction: { title: "Switch", style: Alert.ActionStyle.Default },
          dismissAction: { title: "Cancel" },
        });

        if (!confirmed) return;
        await stopTimer(currentState.issueKey);
      }

      await startTimer(issueKey);

      const newState: TrackingState = {
        isTracking: true,
        issueKey,
        startedAt: new Date().toISOString(),
      };
      await setTrackingState(newState);
      await addRecentIssue(issueKey);
      if (summary) {
        await addRecentIssueWithSummary(issueKey, summary, status);
      }

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

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Start Timer",
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }

  async function handleCustomIssue() {
    const issueKey = extractIssueKey(searchText);
    if (!issueKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Issue Key",
        message: "Enter a valid issue key (e.g., COP-398)",
      });
      return;
    }
    await handleStartTracking(issueKey);
  }

  const filteredIssues = recentIssues
    .filter(
      (issue) =>
        issue.issueKey.toLowerCase().includes(searchText.toLowerCase()) ||
        issue.issueSummary.toLowerCase().includes(searchText.toLowerCase()),
    )
    .sort((a, b) => (a.issueSummary || "").localeCompare(b.issueSummary || ""));

  // Group by status
  const grouped = new Map<string, RecentIssue[]>();
  for (const issue of filteredIssues) {
    const group = getStatusGroup(issue.status);
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(issue);
  }

  // Sort groups by priority order
  const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => getStatusOrder(a) - getStatusOrder(b));

  const currentElapsed =
    currentState?.isTracking && currentState.startedAt ? getElapsedTime(currentState.startedAt) : 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter issues or enter new issue key..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {currentState?.isTracking && currentState.issueKey && (
        <List.Section title="Currently Tracking">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={currentState.issueKey}
            subtitle={formatDuration(currentElapsed)}
            accessories={[{ tag: { value: "Active", color: Color.Green } }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Jira" url={`${jiraBaseUrl}/browse/${currentState.issueKey}`} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {sortedGroups.map(([groupName, issues]) => (
        <List.Section key={groupName} title={groupName} subtitle={`${issues.length} issues`}>
          {issues.map((issue) => (
            <List.Item
              key={issue.issueKey}
              icon={Icon.Document}
              title={`[${issue.issueKey}] ${issue.issueSummary || "No summary"}`}
              accessories={[
                issue.status ? { tag: { value: issue.status, color: getStatusColor(issue.status) } } : {},
                issue.totalSeconds ? { text: formatDuration(issue.totalSeconds) } : {},
                currentState?.issueKey === issue.issueKey ? { tag: { value: "Active", color: Color.Green } } : {},
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Tracking"
                    icon={Icon.Play}
                    onAction={() => handleStartTracking(issue.issueKey, issue.issueSummary, issue.status)}
                  />
                  <Action.OpenInBrowser title="Open in Jira" url={`${jiraBaseUrl}/browse/${issue.issueKey}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {searchText &&
        extractIssueKey(searchText) &&
        !filteredIssues.some((i) => i.issueKey === extractIssueKey(searchText)) && (
          <List.Section title="Start New">
            <List.Item
              icon={Icon.Plus}
              title={`Track ${extractIssueKey(searchText)}`}
              subtitle="Start tracking this issue"
              actions={
                <ActionPanel>
                  <Action title="Start Tracking" icon={Icon.Play} onAction={handleCustomIssue} />
                </ActionPanel>
              }
            />
          </List.Section>
        )}

      {recentIssues.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Recent Issues"
          description="No worklogs found in the last 7 days. Type an issue key above to start tracking."
        />
      )}
    </List>
  );
}
