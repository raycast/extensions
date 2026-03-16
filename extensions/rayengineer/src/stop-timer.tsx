import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  showHUD,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getActiveTimer,
  clearTimer,
  getElapsedSeconds,
  formatDuration,
  roundUpToMinutes,
  parseTimeInput,
  TimerData,
} from "./timer-state";
import {
  addWorklog,
  getDoneTransitions,
  transitionIssue,
  getIssueBrowseUrl,
  JiraTransition,
} from "./jira";

export default function StopTimer() {
  const [timer, setTimer] = useState<TimerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveTimer().then((t) => {
      setTimer(t);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <Detail isLoading />;
  }

  if (!timer) {
    return (
      <Detail markdown="## No timer running\n\nStart a timer first using **Browse Tasks** or **QuickStart Timer**." />
    );
  }

  return <StopTimerForm timer={timer} />;
}

function StopTimerForm({ timer }: { timer: TimerData }) {
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

  const discardTimer = async () => {
    await clearTimer();
    await showHUD("Timer discarded");
  };

  const skipAndClose = async () => {
    await clearTimer();
    await showHUD("Timer stopped without logging");
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
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={skipAndClose}
          />
          <Action
            title="Discard Timer"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={discardTimer}
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
