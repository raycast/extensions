import {
  getPreferenceValues,
  popToRoot,
  showToast,
  Toast,
  Action,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import TimerForm from "./timer-form";
import { HakunaTimer } from "./hakuna-api";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function GetTimer() {
  const { apiToken } = getPreferenceValues<{ apiToken: string }>();
  const [timerStart, setTimerStart] = useState<Date | null>(null);

  useEffect(() => {
    if (!timerStart) return;

    let cancelled = false;
    let toast: Toast | null = null;

    showToast({
      style: Toast.Style.Animated,
      title: "Timer running",
      message: formatDuration(0),
    }).then((t) => {
      toast = t;
      if (cancelled) t.hide();
    });

    const interval = setInterval(() => {
      if (toast)
        toast.message = formatDuration(Date.now() - timerStart.getTime());
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      toast?.hide();
    };
  }, [timerStart]);

  const timer = new HakunaTimer(apiToken);

  return (
    <TimerForm
      apiToken={apiToken}
      mode="timer"
      submitLabel="Update Timer"
      loadInitialValues={async (t) => {
        const current = await t.getTimer();
        if (!current) throw new Error("No active timer");
        setTimerStart(new Date(`${current.date}T${current.start_time}`));
        return {
          projectId: current.project ? String(current.project.id) : undefined,
          taskId: current.task ? String(current.task.id) : undefined,
          startTime: current.start_time,
          note: current.note ?? undefined,
        };
      }}
      onSubmit={async ({ taskId, projectId, startTime, note }) => {
        await timer.updateTimer(taskId, projectId, startTime, note);
        await showToast({ style: Toast.Style.Success, title: "Timer updated" });
        popToRoot();
      }}
      extraActions={
        <Action
          title="Stop Timer"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["cmd"], key: "." }}
          onAction={async () => {
            await timer.stopTimer();
            await showToast({
              style: Toast.Style.Success,
              title: "Timer stopped",
            });
            popToRoot();
          }}
        />
      }
    />
  );
}
