import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  formatDurationHM,
  formatDurationHuman,
  getTaskDurationMs,
  getTimerDuration,
  getTimerProjectName,
  getTimerStatus,
  getTodayTasks,
  subscribeToEvents,
  type SseSubscription,
} from "./api";
import { useClock } from "./use-clock";

export default function TimerStatus() {
  const timer = useCachedPromise(getTimerStatus, [], {
    initialData: null,
    failureToastOptions: { title: "Failed to load timer" },
  });
  const tasks = useCachedPromise(getTodayTasks, [], {
    initialData: [],
    failureToastOptions: { title: "Failed to load tasks" },
  });
  useClock(timer.data?.status === "running");

  useEffect(() => {
    let sub: SseSubscription | null = null;
    let cancelled = false;
    let fallback: ReturnType<typeof setInterval> | null = null;

    function revalidateAll() {
      timer.revalidate();
      tasks.revalidate();
    }

    subscribeToEvents({
      onEvent: (event) => {
        if (
          event.event.startsWith("timer.") ||
          event.event.startsWith("task.")
        ) {
          revalidateAll();
        }
      },
      onError: () => {
        if (!fallback) fallback = setInterval(revalidateAll, 30000);
      },
      // The server ends long streams; keep the view current without reconnecting.
      onClose: () => {
        if (!cancelled && !fallback)
          fallback = setInterval(revalidateAll, 30000);
      },
    })
      .then((s) => {
        if (cancelled) {
          s.close();
        } else {
          sub = s;
        }
      })
      .catch(() => {
        if (!fallback) fallback = setInterval(revalidateAll, 30000);
      });

    return () => {
      cancelled = true;
      sub?.close();
      if (fallback) clearInterval(fallback);
    };
  }, []);

  const currentDuration = timer.data ? getTimerDuration(timer.data) : 0;
  const projectName = timer.data ? getTimerProjectName(timer.data) : undefined;

  const todayTotal = tasks.data.reduce(
    (sum, task) => sum + getTaskDurationMs(task),
    0,
  );

  let statusEmoji = "⏹";
  let statusText = "Stopped";
  let statusColor: Color = Color.SecondaryText;

  if (timer.data?.status === "running") {
    statusEmoji = "▶️";
    statusText = "Running";
    statusColor = Color.Green;
  } else if (timer.data?.status === "paused") {
    statusEmoji = "⏸";
    statusText = "Paused";
    statusColor = Color.Yellow;
  } else if (timer.error && !timer.data) {
    // A failed request must not read as "no timer running".
    statusEmoji = "⚠️";
    statusText = "Unavailable";
    statusColor = Color.Red;
  }

  const isActive =
    timer.data?.status === "running" || timer.data?.status === "paused";

  const markdown = `
# ${statusEmoji} Timer ${statusText}

${
  isActive
    ? `
## Current Session
- **Project:** ${projectName || "Unknown"}
- **Duration:** ${formatDurationHM(currentDuration)}
${timer.data?.task?.description ? `- **Description:** ${timer.data.task.description}` : ""}
`
    : timer.error && !timer.data
      ? `Could not load the timer: ${timer.error.message}. Press ⌘R to try again.`
      : "No timer running."
}

---

## Today's Summary
- **Total Time:** ${formatDurationHuman(todayTotal)}
- **Tasks Completed:** ${tasks.data.length}

${
  tasks.data.length > 0
    ? `
### Tasks
${tasks.data
  .slice(0, 5)
  .map(
    (task) =>
      `- ${task.project?.title || "Unknown"}: ${formatDurationHuman(getTaskDurationMs(task))}`,
  )
  .join("\n")}
${tasks.data.length > 5 ? `\n*...and ${tasks.data.length - 5} more*` : ""}
`
    : ""
}
`;

  return (
    <Detail
      isLoading={timer.isLoading || tasks.isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={statusText}
            icon={{ source: Icon.Circle, tintColor: statusColor }}
          />
          {isActive && (
            <>
              <Detail.Metadata.Label
                title="Project"
                text={projectName || "Unknown"}
              />
              <Detail.Metadata.Label
                title="Duration"
                text={formatDurationHM(currentDuration)}
              />
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Today Total"
            text={formatDurationHuman(todayTotal)}
          />
          <Detail.Metadata.Label
            title="Tasks Today"
            text={String(tasks.data.length)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Timesheet"
            url="https://my.timesheet.io"
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => {
              timer.revalidate();
              tasks.revalidate();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
