import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showHUD,
  showToast,
  Toast,
  confirmAlert,
  Clipboard,
  launchCommand,
  LaunchType,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getActiveTimer,
  startTimer,
  getElapsedSeconds,
  formatDuration,
} from "./timer-state";
import {
  getIssue,
  getMyself,
  getInProgressTransition,
  transitionIssue,
  assignIssue,
} from "./jira";

function extractIssueKey(text: string): string | null {
  const trimmed = text.trim();
  const keyMatch = trimmed.match(/^([A-Z][A-Z0-9]+-\d+)$/);
  if (keyMatch) return keyMatch[1];
  const urlMatch = trimmed.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
  if (urlMatch) return urlMatch[1];
  const anyMatch = trimmed.match(/([A-Z][A-Z0-9]+-\d+)/);
  if (anyMatch) return anyMatch[1];
  return null;
}

export default function StartTimer() {
  const [issueKey, setIssueKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{
    issueKey: string;
    elapsed: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const timer = await getActiveTimer();
      if (timer) {
        setActiveTimer({
          issueKey: timer.issueKey,
          elapsed: getElapsedSeconds(timer),
        });
      }

      const clipboardText = await Clipboard.readText();
      if (clipboardText) {
        const key = extractIssueKey(clipboardText);
        if (key) setIssueKey(key);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Detail isLoading />;

  if (activeTimer) {
    return (
      <Detail
        markdown={`## Timer Already Running\n\n**${activeTimer.issueKey}** — ${formatDuration(activeTimer.elapsed)}\n\nUse **Stop Timer** to stop the current timer first.`}
      />
    );
  }

  const handleSubmit = async (values: { issueKey: string }) => {
    const key = extractIssueKey(values.issueKey);
    if (!key) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid issue key",
        message: values.issueKey,
      });
      return;
    }

    setStarting(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Fetching ${key}...`,
      });
      const issue = await getIssue(key);

      const statusKey = issue.fields.status.statusCategory.key;
      if (statusKey !== "indeterminate") {
        const inProgressTransition = await getInProgressTransition(issue.key);
        if (inProgressTransition) {
          const confirmed = await confirmAlert({
            title: "Move to In Progress?",
            message: `${issue.key} is "${issue.fields.status.name}". Move to "${inProgressTransition.to.name}"?`,
            primaryAction: { title: "Move to In Progress" },
          });
          if (confirmed) {
            await transitionIssue(issue.key, inProgressTransition.id);
          }
        }
      }

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
      try {
        await launchCommand({
          name: "timer-menu",
          type: LaunchType.Background,
        });
      } catch {
        // Menu bar command may already be running
      }
      await showHUD(`Timer started: ${issue.key} - ${issue.fields.summary}`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(error),
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Form
      isLoading={starting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Timer"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="issueKey"
        title="Issue Key"
        placeholder="e.g. PROJ-123 or Jira URL"
        info="Pre-filled from clipboard. Override if needed."
        value={issueKey}
        onChange={setIssueKey}
      />
    </Form>
  );
}
