import {
  getPreferenceValues,
  popToRoot,
  showToast,
  Toast,
  confirmAlert,
  useNavigation,
  LaunchProps,
} from "@raycast/api";
import TimerForm from "./timer-form";
import { HakunaClient, TimerResponse } from "./hakuna-api";

interface Props {
  projectId?: string;
  taskId?: string;
  note?: string;
  entry?: TimerResponse;
  onUpdate?: (updated: TimerResponse) => void;
}

export default function TimeEntry(
  props: Props &
    Partial<LaunchProps<{ launchContext: { entry?: TimerResponse } }>>,
) {
  const { projectId, taskId, note, onUpdate } = props;
  const entry = props.entry ?? props.launchContext?.entry;
  const { apiToken } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const timer = new HakunaClient(apiToken);
  const today = new Date().toISOString().split("T")[0];

  if (entry) {
    return (
      <TimerForm
        apiToken={apiToken}
        mode="entry"
        submitLabel="Update Entry"
        endTimeRequired
        entryDate={entry.date}
        loadInitialValues={async () => ({
          projectId: entry.project ? String(entry.project.id) : undefined,
          taskId: entry.task ? String(entry.task.id) : undefined,
          startTime: entry.start_time.slice(0, 5),
          endTime: entry.end_time ? entry.end_time.slice(0, 5) : undefined,
          note: entry.note ?? undefined,
        })}
        onSubmit={async ({
          taskId: tid,
          projectId: pid,
          startTime,
          endTime,
          note: n,
        }) => {
          if (!endTime) return;
          const updated = await timer.updateTimeEntry(
            entry.id,
            tid,
            pid,
            entry.date,
            startTime ?? entry.start_time.slice(0, 5),
            endTime,
            n || undefined,
          );
          await showToast({
            style: Toast.Style.Success,
            title: "Entry updated",
          });
          onUpdate?.(updated);
          pop();
        }}
      />
    );
  }

  return (
    <TimerForm
      apiToken={apiToken}
      mode="entry"
      entryDate={today}
      loadInitialValues={async () => ({ projectId, taskId, note })}
      onSubmit={async ({
        taskId: tid,
        projectId: pid,
        startTime,
        endTime,
        note: n,
      }) => {
        if (endTime) {
          await timer.createTimeEntry(
            tid,
            pid,
            today,
            startTime ?? "00:00",
            endTime,
            n || undefined,
          );
          await showToast({ style: Toast.Style.Success, title: "Entry saved" });
          popToRoot();
          return;
        }

        const existing = await timer.getTimer();
        if (existing) {
          const taskName = existing.task?.name ?? "unknown task";
          const confirmed = await confirmAlert({
            title: "Timer Already Running",
            message: `A timer is running for "${taskName}". Stop it and start a new timer?`,
            primaryAction: { title: "Stop and Start New" },
          });
          if (!confirmed) return;
          await timer.stopTimer();
        }

        const started = await timer.startTimer(
          tid,
          pid,
          startTime,
          n || undefined,
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
        popToRoot();
      }}
    />
  );
}
