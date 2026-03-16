import {
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getActiveTimer,
  getElapsedSeconds,
  formatDurationShort,
  pauseTimer,
  resumeTimer,
  clearTimer,
  TimerData,
} from "./timer-state";
import { getIssueBrowseUrl } from "./jira";

export default function TimerMenu() {
  const [timer, setTimer] = useState<TimerData | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const loadTimer = async () => {
    const t = await getActiveTimer();
    setTimer(t);
    if (t) {
      setElapsed(getElapsedSeconds(t));
    }
  };

  useEffect(() => {
    loadTimer();
    const interval = setInterval(loadTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timer) {
    return (
      <MenuBarExtra icon={Icon.Clock} tooltip="I, Engineer - No timer running">
        <MenuBarExtra.Item
          title="No timer running"
          onAction={async () => {
            await launchCommand({
              name: "browse-tasks",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Browse Tasks..."
          onAction={async () => {
            await launchCommand({
              name: "browse-tasks",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      </MenuBarExtra>
    );
  }

  const title = timer.paused
    ? `${timer.issueKey} paused`
    : `${timer.issueKey} ${formatDurationShort(elapsed)}`;

  return (
    <MenuBarExtra
      icon={timer.paused ? Icon.Pause : Icon.Clock}
      title={title}
      tooltip={timer.issueSummary}
    >
      <MenuBarExtra.Item title={timer.issueSummary} />
      <MenuBarExtra.Item title={`Elapsed: ${formatDurationShort(elapsed)}`} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={timer.paused ? "Resume" : "Pause"}
        icon={timer.paused ? Icon.Play : Icon.Pause}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        onAction={async () => {
          if (timer.paused) {
            await resumeTimer();
          } else {
            await pauseTimer();
          }
          await loadTimer();
        }}
      />
      <MenuBarExtra.Item
        title="Stop & Log Time"
        icon={Icon.Stop}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={async () => {
          await launchCommand({
            name: "browse-tasks",
            type: LaunchType.UserInitiated,
          });
        }}
      />
      <MenuBarExtra.Item
        title="Open in Jira"
        icon={Icon.Globe}
        onAction={async () => {
          await open(getIssueBrowseUrl(timer.issueKey));
        }}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Discard Timer"
        icon={Icon.Trash}
        onAction={async () => {
          await clearTimer();
          await loadTimer();
        }}
      />
    </MenuBarExtra>
  );
}
