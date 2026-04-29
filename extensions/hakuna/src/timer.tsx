import {
  getPreferenceValues,
  popToRoot,
  showToast,
  Toast,
  Action,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState } from "react";
import TimerForm from "./timer-form";
import { HakunaTimer } from "./hakuna-api";

export default function Timer() {
  const { apiToken } = getPreferenceValues<Preferences>();
  const [timerDate, setTimerDate] = useState<string | undefined>(undefined);
  const isRunning = timerDate !== undefined;

  const timer = new HakunaTimer(apiToken);

  return (
    <TimerForm
      apiToken={apiToken}
      mode="timer"
      timerDate={timerDate}
      loadInitialValues={async (t) => {
        const current = await t.getTimer();
        if (!current) {
          setTimerDate(undefined);
          return undefined;
        }
        setTimerDate(current.date);
        return {
          projectId: current.project ? String(current.project.id) : undefined,
          taskId: current.task ? String(current.task.id) : undefined,
          startTime: current.start_time,
          note: current.note ?? undefined,
        };
      }}
      onSubmit={async ({ taskId, projectId, startTime, endTime, note }) => {
        const today = new Date().toISOString().split("T")[0];

        if (endTime) {
          if (isRunning) {
            await timer.deleteTimer();
          }
          await timer.createTimeEntry(
            taskId,
            projectId,
            timerDate ?? today,
            startTime ?? "00:00",
            endTime,
            note || undefined,
          );
          await showToast({ style: Toast.Style.Success, title: "Entry saved" });
        } else if (isRunning) {
          await timer.updateTimer(taskId, projectId, startTime, note);
          await showToast({
            style: Toast.Style.Success,
            title: "Timer updated",
          });
        } else {
          const started = await timer.startTimer(
            taskId,
            projectId,
            startTime,
            note || undefined,
          );
          let title = "Timer started";
          if (started.date && started.start_time) {
            const [y, mo, d] = started.date.split("-").map(Number);
            const [h, m] = started.start_time.split(":").map(Number);
            const elapsed =
              Date.now() - new Date(y, mo - 1, d, h, m, 0).getTime();
            if (elapsed > 5 * 60 * 1000) {
              const hh = Math.floor(elapsed / 3600000)
                .toString()
                .padStart(2, "0");
              const mm = Math.floor((elapsed % 3600000) / 60000)
                .toString()
                .padStart(2, "0");
              title = `Timer started ${hh}:${mm} ago at ${started.start_time}`;
            }
          }
          await showToast({ style: Toast.Style.Success, title });
        }
        popToRoot();
      }}
      extraActions={
        isRunning ? (
          <>
            <Action
              title="Stop Timer"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={async () => {
                const stopped = await timer.stopTimer();
                await showToast({
                  style: Toast.Style.Success,
                  title: `Timer stopped at ${stopped.end_time} after ${stopped.duration}`,
                });
                popToRoot();
              }}
            />
            <Action
              title="Cancel Timer"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Cancel Timer",
                  message:
                    "Are you sure you want to cancel the current timer? This cannot be undone.",
                  primaryAction: {
                    title: "Cancel Timer",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!confirmed) return;
                await timer.deleteTimer();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Timer cancelled",
                });
                popToRoot();
              }}
            />
          </>
        ) : undefined
      }
    />
  );
}
