import { getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import TimerForm from "./timer-form";
import { HakunaTimer } from "./hakuna-api";

interface Props {
  projectId?: string;
  taskId?: string;
  note?: string;
}

export default function StartTimerView({ projectId, taskId, note }: Props) {
  const { apiToken } = getPreferenceValues<{ apiToken: string }>();
  const timer = new HakunaTimer(apiToken);

  return (
    <TimerForm
      apiToken={apiToken}
      mode="timer"
      loadInitialValues={async () => ({ projectId, taskId, note })}
      onSubmit={async ({
        taskId: tid,
        projectId: pid,
        startTime,
        endTime,
        note,
      }) => {
        const today = new Date().toISOString().split("T")[0];

        if (endTime) {
          await timer.createTimeEntry(
            tid,
            pid,
            today,
            startTime ?? "00:00",
            endTime,
            note || undefined,
          );
          await showToast({ style: Toast.Style.Success, title: "Entry saved" });
        } else {
          const started = await timer.startTimer(
            tid,
            pid,
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
    />
  );
}
