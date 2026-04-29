import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { HakunaTimer, TimerResponse, formatDuration } from "./hakuna-api";
import { ProjectsList } from "./project";
import { getSettings } from "./settings";
import Timer from "./timer";
import AddTimeEntry from "./add-time-entry";
import StartTimerView from "./start-timer-view";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function offsetDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(":").map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

function sumDurations(
  entries: TimerResponse[],
  timerElapsed: number,
  durationFormat: string,
): string {
  const entriesTotal = entries
    .filter((e) => e.end_time !== null)
    .reduce((sum, e) => sum + parseDurationToSeconds(e.duration), 0);
  return formatDuration(entriesTotal + timerElapsed, durationFormat);
}

function navigationTitle(date: string, todayStr: string): string {
  const weekday = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
  let label: string | null = null;
  if (date === todayStr) label = "Today";
  else if (date === offsetDate(todayStr, -1)) label = "Yesterday";
  else if (date === offsetDate(todayStr, 1)) label = "Tomorrow";
  return label ? `${weekday}, ${date} (${label})` : `${weekday}, ${date}`;
}

function EntryDetail({
  entry,
  durationFormat,
}: {
  entry: TimerResponse;
  durationFormat: string;
}) {
  const { push } = useNavigation();
  const timeRange = `${formatTime(entry.start_time)} – ${entry.end_time ? formatTime(entry.end_time) : "running"}`;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Time" text={timeRange} />
          <List.Item.Detail.Metadata.Label
            title="Duration"
            text={formatDuration(
              parseDurationToSeconds(entry.duration),
              durationFormat,
            )}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Task"
            text={entry.task?.name ?? "—"}
          />
          {entry.project && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Project"
                text={
                  entry.project.code
                    ? `[${entry.project.code}] ${entry.project.name}`
                    : entry.project.name
                }
              />
              <List.Item.Detail.Metadata.TagList title="Customer">
                <List.Item.Detail.Metadata.TagList.Item
                  text={entry.project.client}
                  onAction={() =>
                    push(<ProjectsList initialClient={entry.project!.client} />)
                  }
                />
              </List.Item.Detail.Metadata.TagList>
            </>
          )}
          {entry.note && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Note" text={entry.note} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

type NavProps = {
  onPrevDay: () => void;
  onNextDay: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

function NavSection({
  onPrevDay,
  onNextDay,
  onPrevWeek,
  onNextWeek,
  onToday,
}: NavProps) {
  return (
    <ActionPanel.Section>
      <Action
        title="Previous Day"
        icon={Icon.ArrowLeft}
        shortcut={{ modifiers: ["cmd"], key: "h" }}
        onAction={onPrevDay}
      />
      <Action
        title="Next Day"
        icon={Icon.ArrowRight}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        onAction={onNextDay}
      />
      <Action
        title="Previous Week"
        icon={Icon.ArrowLeft}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        onAction={onPrevWeek}
      />
      <Action
        title="Next Week"
        icon={Icon.ArrowRight}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={onNextWeek}
      />
      <Action
        title="Go to Today"
        icon={Icon.Calendar}
        shortcut={{ modifiers: ["cmd"], key: "0" }}
        onAction={onToday}
      />
    </ActionPanel.Section>
  );
}

function EntryItem({
  entry,
  durationFormat,
  onDelete,
  onUpdate,
  ...nav
}: {
  entry: TimerResponse;
  durationFormat: string;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (updated: TimerResponse) => void;
} & NavProps) {
  const { push } = useNavigation();
  const title = entry.task?.name ?? "No task";
  const timeRange = `${formatTime(entry.start_time)} – ${entry.end_time ? formatTime(entry.end_time) : "running"}`;

  return (
    <List.Item
      title={title}
      subtitle={timeRange}
      detail={<EntryDetail entry={entry} durationFormat={durationFormat} />}
      actions={
        <ActionPanel>
          <Action
            title="Edit Entry"
            icon={Icon.Pencil}
            onAction={() =>
              push(<AddTimeEntry entry={entry} onUpdate={onUpdate} />)
            }
          />
          <Action
            title="Add Entry"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() =>
              push(
                <AddTimeEntry
                  projectId={
                    entry.project ? String(entry.project.id) : undefined
                  }
                  taskId={entry.task ? String(entry.task.id) : undefined}
                  note={entry.note ?? undefined}
                />,
              )
            }
          />
          <Action
            title="Start Timer"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() =>
              push(
                <StartTimerView
                  projectId={
                    entry.project ? String(entry.project.id) : undefined
                  }
                  taskId={entry.task ? String(entry.task.id) : undefined}
                  note={entry.note ?? undefined}
                />,
              )
            }
          />
          <Action
            title="Delete Entry"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Delete Time Entry",
                message: `Delete "${title}" (${entry.duration})?`,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (confirmed) await onDelete(entry.id);
            }}
          />
          <NavSection {...nav} />
        </ActionPanel>
      }
    />
  );
}

function TimerItem({
  timer,
  durationFormat,
  onStop,
  onCancel,
  ...nav
}: {
  timer: TimerResponse;
  durationFormat: string;
  onStop: () => Promise<void>;
  onCancel: () => Promise<void>;
} & NavProps) {
  const { push } = useNavigation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const [y, mo, d] = timer.date.split("-").map(Number);
    const [h, m, s] = timer.start_time.split(":").map(Number);
    const start = new Date(y, mo - 1, d, h, m, s ?? 0).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [timer.date, timer.start_time]);

  const title = timer.task?.name ?? "Running Timer";
  const timeRange = `${formatTime(timer.start_time)} – running`;

  return (
    <List.Item
      title={title}
      subtitle={timeRange}
      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Time" text={timeRange} />
              <List.Item.Detail.Metadata.Label
                title="Duration"
                text={formatDuration(elapsed, durationFormat)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Task"
                text={timer.task?.name ?? "—"}
              />
              {timer.project && (
                <>
                  <List.Item.Detail.Metadata.Label
                    title="Project"
                    text={
                      timer.project.code
                        ? `[${timer.project.code}] ${timer.project.name}`
                        : timer.project.name
                    }
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Customer"
                    text={timer.project.client}
                  />
                </>
              )}
              {timer.note && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Note"
                    text={timer.note}
                  />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Timer"
            icon={Icon.Clock}
            onAction={() => push(<Timer />)}
          />
          <Action
            title="Stop Timer"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={onStop}
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
              if (confirmed) await onCancel();
            }}
          />
          <NavSection {...nav} />
        </ActionPanel>
      }
    />
  );
}

function TimerSection({
  timer,
  durationFormat,
  onStop,
  onCancel,
  ...nav
}: {
  timer: TimerResponse;
  durationFormat: string;
  onStop: () => Promise<void>;
  onCancel: () => Promise<void>;
} & NavProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const [y, mo, d] = timer.date.split("-").map(Number);
    const [h, m, s] = timer.start_time.split(":").map(Number);
    const start = new Date(y, mo - 1, d, h, m, s ?? 0).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [timer.date, timer.start_time]);

  return (
    <List.Section
      title="Timer"
      subtitle={formatDuration(elapsed, durationFormat)}
    >
      <TimerItem
        timer={timer}
        durationFormat={durationFormat}
        onStop={onStop}
        onCancel={onCancel}
        {...nav}
      />
    </List.Section>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [todayStr, setTodayStr] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [date, setDate] = useState(todayStr);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setTodayStr(new Date().toISOString().split("T")[0]),
      60_000,
    );
    return () => clearInterval(interval);
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<TimerResponse[]>([]);
  const [runningTimer, setRunningTimer] = useState<TimerResponse | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const { apiToken } = getSettings();
  const api = new HakunaTimer(apiToken);
  const { data: company } = useCachedPromise(
    (token: string) => new HakunaTimer(token).getCompany(),
    [apiToken],
  );
  const durationFormat = company?.duration_format ?? "hhmm";

  useEffect(() => {
    setIsLoading(true);
    setEntries([]);
    setRunningTimer(null);
    (async () => {
      try {
        const [fetchedEntries, fetchedTimer] = await Promise.all([
          api.getTimeEntries(date),
          api.getTimer(),
        ]);
        setEntries(fetchedEntries);
        setRunningTimer(fetchedTimer);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load time entries",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [date, reloadKey]);

  useEffect(() => {
    if (!runningTimer) {
      setTimerElapsed(0);
      return;
    }
    const [y, mo, d] = runningTimer.date.split("-").map(Number);
    const [h, m, s] = runningTimer.start_time.split(":").map(Number);
    const start = new Date(y, mo - 1, d, h, m, s ?? 0).getTime();
    const tick = () => setTimerElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [runningTimer?.id]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function goToPrevDay() {
    setDate((d) => offsetDate(d, -1));
  }
  function goToNextDay() {
    setDate((d) => offsetDate(d, 1));
  }
  function goToPrevWeek() {
    setDate((d) => offsetDate(d, -7));
  }
  function goToNextWeek() {
    setDate((d) => offsetDate(d, 7));
  }
  function goToToday() {
    setDate(todayStr);
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTimeEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete entry",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function handleUpdate(updated: TimerResponse) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  async function handleStopTimer() {
    try {
      const stopped = await api.stopTimer();
      await showToast({
        style: Toast.Style.Success,
        title: `Timer stopped after ${stopped.duration}`,
      });
      reload();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop timer",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCancelTimer() {
    try {
      await api.deleteTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer cancelled" });
      reload();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to cancel timer",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const nav: NavProps = {
    onPrevDay: goToPrevDay,
    onNextDay: goToNextDay,
    onPrevWeek: goToPrevWeek,
    onNextWeek: goToNextWeek,
    onToday: goToToday,
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={navigationTitle(date, todayStr)}
    >
      {entries.length === 0 && !runningTimer && !isLoading && (
        <List.EmptyView
          title={`No time entries for ${date}`}
          description="Press Enter to add an entry, or ⌘T to start a timer"
          actions={
            <ActionPanel>
              <Action
                title="Add Entry"
                icon={Icon.Plus}
                onAction={() => push(<AddTimeEntry />)}
              />
              <Action
                title="Start Timer"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => push(<Timer />)}
              />
              <NavSection {...nav} />
            </ActionPanel>
          }
        />
      )}
      {runningTimer && (
        <TimerSection
          timer={runningTimer}
          durationFormat={durationFormat}
          onStop={handleStopTimer}
          onCancel={handleCancelTimer}
          {...nav}
        />
      )}

      {entries.length > 0 && (
        <List.Section
          title="Entries"
          subtitle={sumDurations(entries, timerElapsed, durationFormat)}
        >
          {entries.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              durationFormat={durationFormat}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              {...nav}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
