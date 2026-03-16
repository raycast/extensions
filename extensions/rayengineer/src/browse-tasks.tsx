import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
  showHUD,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  getAssignedIssues,
  getRecentIssues,
  addWorklog,
  getInProgressTransition,
  getDoneTransitions,
  transitionIssue,
  assignIssue,
  getMyself,
  getIssueBrowseUrl,
  JiraIssue,
  JiraTransition,
} from "./jira";
import {
  getActiveTimer,
  startTimer,
  clearTimer,
  pauseTimer,
  resumeTimer,
  getElapsedSeconds,
  formatDuration,
  roundUpToMinutes,
  parseTimeInput,
  TimerData,
} from "./timer-state";

export default function BrowseTasks() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<TimerData | null>(null);
  const { push } = useNavigation();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const timer = await getActiveTimer();
      setActiveTimer(timer);

      const [assigned, recent] = await Promise.all([
        getAssignedIssues(),
        getRecentIssues(),
      ]);

      const seen = new Set<string>();
      const combined: JiraIssue[] = [];
      for (const issue of [...assigned, ...recent]) {
        if (!seen.has(issue.key)) {
          seen.add(issue.key);
          combined.push(issue);
        }
      }
      setIssues(combined);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load issues",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectIssue = useCallback(
    async (issue: JiraIssue) => {
      const timer = await getActiveTimer();

      if (timer && timer.issueKey === issue.key) {
        // Stop the timer for this issue
        push(<StopTimerView timer={timer} onDone={loadData} />);
        return;
      }

      if (timer) {
        const confirmed = await confirmAlert({
          title: "Timer Already Running",
          message: `Timer is running for ${timer.issueKey}. Stop it and start a new one?`,
          primaryAction: {
            title: "Stop & Start New",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) return;
        push(
          <StopTimerView timer={timer} onDone={() => startNewTimer(issue)} />,
        );
        return;
      }

      await startNewTimer(issue);
    },
    [push, loadData],
  );

  const startNewTimer = async (issue: JiraIssue) => {
    try {
      // Check status and offer to move to In Progress
      const statusKey = issue.fields.status.statusCategory.key;
      if (statusKey !== "indeterminate") {
        const inProgressTransition = await getInProgressTransition(issue.key);
        if (inProgressTransition) {
          const confirmed = await confirmAlert({
            title: "Move to In Progress?",
            message: `${issue.key} is currently "${issue.fields.status.name}". Move to "${inProgressTransition.to.name}"?`,
            primaryAction: { title: "Move to In Progress" },
          });
          if (confirmed) {
            await transitionIssue(issue.key, inProgressTransition.id);
          }
        }
      }

      // Check assignment
      const user = await getMyself();
      if (
        !issue.fields.assignee ||
        issue.fields.assignee.accountId !== user.accountId
      ) {
        const confirmed = await confirmAlert({
          title: "Assign to You?",
          message: `${issue.key} is not assigned to you. Assign it?`,
          primaryAction: { title: "Assign to Me" },
        });
        if (confirmed) {
          await assignIssue(issue.key, user.accountId);
        }
      }

      await startTimer(issue.key, issue.fields.summary);
      // Launch menu bar timer so it appears automatically
      try {
        await launchCommand({
          name: "timer-menu",
          type: LaunchType.Background,
        });
      } catch {
        // Menu bar command may already be running
      }
      await showHUD(`Timer started for ${issue.key}`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(error),
      });
    }
  };

  // Timer section for currently running timer
  const timerSection = activeTimer ? (
    <List.Section title="Running Timer">
      <List.Item
        icon={{ source: Icon.Clock, tintColor: Color.Green }}
        title={activeTimer.issueKey}
        subtitle={activeTimer.issueSummary}
        accessories={[
          {
            text: activeTimer.paused
              ? "Paused"
              : formatDuration(getElapsedSeconds(activeTimer)),
            icon: activeTimer.paused ? Icon.Pause : Icon.Clock,
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Stop Timer"
              icon={Icon.Stop}
              onAction={() =>
                push(<StopTimerView timer={activeTimer} onDone={loadData} />)
              }
            />
            <Action
              title={activeTimer.paused ? "Resume Timer" : "Pause Timer"}
              icon={activeTimer.paused ? Icon.Play : Icon.Pause}
              onAction={async () => {
                if (activeTimer.paused) {
                  await resumeTimer();
                } else {
                  await pauseTimer();
                }
                await loadData();
              }}
            />
            <Action
              title="Discard Timer"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Discard Timer?",
                  message:
                    "This will discard the tracked time without logging.",
                  primaryAction: {
                    title: "Discard",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (confirmed) {
                  await clearTimer();
                  await showHUD("Timer discarded");
                  await loadData();
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  ) : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks or enter issue key (e.g. PROJ-123)..."
    >
      {timerSection}
      <List.Section title="Active Tasks">
        {issues.map((issue) => (
          <List.Item
            key={issue.key}
            icon={getStatusIcon(issue.fields.status.statusCategory.key)}
            title={issue.key}
            subtitle={issue.fields.summary}
            accessories={[
              {
                tag: {
                  value: issue.fields.status.name,
                  color: getStatusColor(issue.fields.status.statusCategory.key),
                },
              },
              { text: issue.fields.project.name },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={
                    activeTimer?.issueKey === issue.key
                      ? "Stop Timer"
                      : "Start Timer"
                  }
                  icon={
                    activeTimer?.issueKey === issue.key ? Icon.Stop : Icon.Play
                  }
                  onAction={() => handleSelectIssue(issue)}
                />
                <Action.OpenInBrowser
                  title="Open in Jira"
                  url={getIssueBrowseUrl(issue.key)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadData}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Open Issue by Key"
                  icon={Icon.MagnifyingGlass}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={async () => {
                    // Use the search bar text as issue key
                    const key = await showToast({
                      style: Toast.Style.Animated,
                      title: "Enter issue key in search bar",
                    });
                    key.hide();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Manual Entry">
        <List.Item
          icon={Icon.Plus}
          title="Enter Issue Key..."
          subtitle="Type a Jira issue key (e.g. PROJ-123) in the search bar"
          actions={
            <ActionPanel>
              <Action
                title="Fetch Issue"
                icon={Icon.Download}
                onAction={async () => {
                  // Placeholder - user types key in search
                  showToast({
                    style: Toast.Style.Animated,
                    title: "Type issue key in search bar and press Enter",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function StopTimerView({
  timer,
  onDone,
}: {
  timer: TimerData;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const elapsed = getElapsedSeconds(timer);
  const rounded = roundUpToMinutes(elapsed);
  const [adjustedSeconds, setAdjustedSeconds] = useState(rounded);
  const [customTime, setCustomTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [doneTransitions, setDoneTransitions] = useState<JiraTransition[]>([]);

  useEffect(() => {
    getDoneTransitions(timer.issueKey)
      .then(setDoneTransitions)
      .catch(() => {});
  }, [timer.issueKey]);

  const logTime = async (transitionId?: string) => {
    setIsSaving(true);
    try {
      await addWorklog(timer.issueKey, adjustedSeconds);

      if (transitionId) {
        await transitionIssue(timer.issueKey, transitionId);
      }

      await clearTimer();
      await showHUD(
        `Logged ${formatDuration(adjustedSeconds)} to ${timer.issueKey}${transitionId ? " (moved to Done)" : ""}`,
      );
      onDone();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to log time",
        message: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const skipAndClose = async () => {
    await clearTimer();
    await showHUD("Timer stopped without logging");
    onDone();
    pop();
  };

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Log Time to Jira"
            icon={Icon.Upload}
            onSubmit={async (values) => {
              if (values.customTime) {
                const parsed = parseTimeInput(values.customTime);
                if (parsed) setAdjustedSeconds(parsed);
              }
              await logTime();
            }}
          />
          {doneTransitions.map((t) => (
            <Action
              key={t.id}
              title={`Log & Move to ${t.to.name}`}
              icon={Icon.CheckCircle}
              onAction={() => logTime(t.id)}
            />
          ))}
          <Action
            title="Add 5 Minutes"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
            onAction={() => setAdjustedSeconds((s) => s + 300)}
          />
          <Action
            title="Subtract 5 Minutes"
            icon={Icon.Minus}
            shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
            onAction={() => setAdjustedSeconds((s) => Math.max(60, s - 300))}
          />
          <Action
            title="Skip Logging"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={skipAndClose}
          />
          <Action.OpenInBrowser
            title="Open in Jira"
            url={getIssueBrowseUrl(timer.issueKey)}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Issue"
        text={`${timer.issueKey} - ${timer.issueSummary}`}
      />
      <Form.Description title="Actual Time" text={formatDuration(elapsed)} />
      <Form.Description
        title="Time to Log"
        text={formatDuration(adjustedSeconds)}
      />
      <Form.Separator />
      <Form.TextField
        id="customTime"
        title="Custom Time"
        placeholder="e.g. 1h30m, 45m, 2h"
        info="Override the time to log. Use format like 1h30m, 45m, etc. Use Cmd+Up/Down to adjust by 5 minutes."
        value={customTime}
        onChange={(val) => {
          setCustomTime(val);
          const parsed = parseTimeInput(val);
          if (parsed) setAdjustedSeconds(parsed);
        }}
      />
    </Form>
  );
}

function getStatusIcon(categoryKey: string): {
  source: Icon;
  tintColor: Color;
} {
  switch (categoryKey) {
    case "indeterminate":
      return { source: Icon.CircleProgress50, tintColor: Color.Blue };
    case "done":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function getStatusColor(categoryKey: string): Color {
  switch (categoryKey) {
    case "indeterminate":
      return Color.Blue;
    case "done":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}
