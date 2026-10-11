import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  List,
  confirmAlert,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Task, getDailyNotePath } from "./parser";
import { getAppPreferences } from "./preferences";
import {
  TaskSource,
  TaskGroup,
  createTaskSource,
  getTaskMode,
} from "./task-source";
import {
  TimerState,
  getLastLog,
  getRemainingMs,
  formatRemaining,
} from "./timer";
import {
  CompletedType,
  CompletionContext,
  Unavailable,
  completedTypeOf,
  describeError,
  isUnavailable,
  settle,
  startSession,
  stopSession,
} from "./session";

// While another command holds the session lock, a refresh is retried a few
// times before giving up, so the view recovers on its own.
const REFRESH_RETRY_MS = 300;
const REFRESH_MAX_RETRIES = 5;

// Nothing was written in either case. "busy": another command held the
// session lock for the whole wait — just try again. "error": the lock could
// not be taken at all — show the cause.
async function reportUnavailable(result: Unavailable) {
  if (result.status === "busy") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Timer is busy",
      message: "Another command is updating it — try again",
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not update the timer",
      message: describeError(result.error),
    });
  }
}

interface ResumeTarget {
  taskTitle: string;
  subtaskTitle?: string;
}

export default function StartTimerCommand(
  props: LaunchProps<{ launchContext: CompletionContext }>,
) {
  return <TaskListView completion={props.launchContext} />;
}

function TaskListView({ completion }: { completion?: CompletionContext }) {
  const prefs = getAppPreferences();
  const { pomoDuration, breakDuration } = prefs;
  // Daily Note mode without a directory: show setup guidance instead of an
  // empty (or crashing) list.
  const needsDailyNoteDir =
    prefs.taskMode === "dailynote" && prefs.dailyNotePath === "";

  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null);
  const [completedType, setCompletedType] = useState<CompletedType | undefined>(
    completion?.completedType,
  );
  // Last pomodoro logged today: the task offered by "Resume".
  // undefined until loaded, so the completion prompt never shows a placeholder.
  const [lastTask, setLastTask] = useState<ResumeTarget | null | undefined>(
    undefined,
  );
  const [taskSource] = useState<TaskSource>(() => createTaskSource());
  const isManual = getTaskMode() === "manual";

  // Timer state shown by the view; called on mount and after every change,
  // since the view stays open behind the HUD and must not go stale.
  async function loadLastTask() {
    const last = await getLastLog();
    setLastTask(
      last
        ? { taskTitle: last.taskTitle, subtaskTitle: last.subtaskTitle }
        : null,
    );
  }

  async function refresh(attempt = 0) {
    const settled = await settle();
    if (settled.status === "busy") {
      // Reading the log needs no lock: do it now so the view never stays in
      // its loading state, then try the timer again shortly.
      await loadLastTask();
      if (attempt < REFRESH_MAX_RETRIES) {
        setTimeout(() => refresh(attempt + 1), REFRESH_RETRY_MS);
      } else {
        await reportUnavailable(settled);
      }
      return;
    }
    if (settled.status === "error") {
      await loadLastTask();
      await reportUnavailable(settled);
      return;
    }
    const { running, finished } = settled;
    setActiveTimer(running);
    // Opened directly (not via the menu bar) after a session ran out:
    // show the completion prompt just the same.
    if (finished) setCompletedType(completedTypeOf(finished));
    await loadLastTask();
  }

  // Re-run when relaunched with a new completion context while already open.
  useEffect(() => {
    setCompletedType(completion?.completedType);
    taskSource.getTasks().then(setGroups);
    refresh();
  }, [completion]);

  async function handleStartPomodoro(task: Task, subtaskTitle?: string) {
    const settled = await settle();
    if (isUnavailable(settled)) return reportUnavailable(settled);
    const { running } = settled;
    let minutes = pomoDuration;
    if (running && !running.isBreak) {
      // Pomodoro running — confirm switch and preserve remaining time
      const remainingMs = getRemainingMs(running);
      const confirmed = await confirmAlert({
        title: "Timer is running",
        message: `"${running.subtaskTitle || running.taskTitle}" has ${formatRemaining(remainingMs)} remaining. Switch task and keep the remaining time?`,
        primaryAction: { title: "Switch Task" },
        dismissAction: { title: "Cancel" },
      });
      if (!confirmed) return;
      minutes = remainingMs / 60000;
    }
    // The dialog ran outside the lock, so start only if the timer we decided
    // on is still the stored one. A running break is dropped; a pomodoro is
    // logged as stopped early — both inside startSession().
    const started = await startSession(
      { taskTitle: task.title, subtaskTitle, durationMinutes: minutes },
      { expectCurrentId: running?.id ?? null },
    );
    if (isUnavailable(started)) return reportUnavailable(started);
    if (started.status === "changed") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Timer changed",
        message: "Another command changed the timer — pick again",
      });
      await refresh();
      return;
    }

    const label = subtaskTitle || task.title;
    setCompletedType(undefined);
    await refresh();
    await showHUD(`🍅 ${label} — ${Math.ceil(minutes)}min`);
  }

  async function handleStartBreak() {
    const started = await startSession({
      taskTitle: "Break",
      durationMinutes: breakDuration,
      isBreak: true,
    });
    if (isUnavailable(started)) return reportUnavailable(started);
    setCompletedType(undefined);
    await refresh();
    await showHUD(`☕ Break — ${breakDuration}min`);
  }

  async function handleResume() {
    if (!lastTask) return;
    const started = await startSession({
      taskTitle: lastTask.taskTitle,
      subtaskTitle: lastTask.subtaskTitle,
      durationMinutes: pomoDuration,
    });
    if (isUnavailable(started)) return reportUnavailable(started);
    setCompletedType(undefined);
    await refresh();
    const label = lastTask.subtaskTitle || lastTask.taskTitle;
    await showHUD(`🍅 ${label} — ${pomoDuration}min`);
  }

  async function handleStopTimer() {
    const result = await stopSession();
    if (isUnavailable(result)) return reportUnavailable(result);
    await refresh();
    await showToast({
      style: Toast.Style.Success,
      title: result.stopped
        ? "Timer stopped"
        : result.finished
          ? "Timer had already finished"
          : "No active timer",
    });
  }

  async function handleMarkDone(task: Task) {
    if (taskSource.markDone) {
      const result = await taskSource.markDone(task.title);
      if (isUnavailable(result)) return reportUnavailable(result);
      const updated = await taskSource.getTasks();
      setGroups(updated);
      await showToast({
        style: Toast.Style.Success,
        title: `✅ ${task.title}`,
      });
    }
  }

  async function handleMarkSubtaskDone(task: Task, subtaskTitle: string) {
    if (taskSource.markSubtaskDone) {
      const result = await taskSource.markSubtaskDone(task.title, subtaskTitle);
      if (isUnavailable(result)) return reportUnavailable(result);
      const updated = await taskSource.getTasks();
      setGroups(updated);
      await showToast({
        style: Toast.Style.Success,
        title: `✅ ${subtaskTitle}`,
      });
    }
  }

  async function handleRemoveTask(task: Task) {
    if (taskSource.removeTask) {
      const result = await taskSource.removeTask(task.title);
      if (isUnavailable(result)) return reportUnavailable(result);
      const updated = await taskSource.getTasks();
      setGroups(updated);
      await showToast({
        style: Toast.Style.Success,
        title: `Removed "${task.title}"`,
      });
    }
  }

  async function handleAdHocStart() {
    const title = searchText.trim();
    const task: Task = { pomodoros: 1, title, subtasks: [], done: false };
    if (isManual && taskSource.addTask) {
      const result = await taskSource.addTask(title);
      if (isUnavailable(result)) return reportUnavailable(result);
      const updated = await taskSource.getTasks();
      setGroups(updated);
    }
    await handleStartPomodoro(task);
  }

  const lastTaskLabel = lastTask
    ? lastTask.subtaskTitle || lastTask.taskTitle
    : null;

  const timerDisplay = activeTimer
    ? `${activeTimer.subtaskTitle || activeTimer.taskTitle} (${formatRemaining(getRemainingMs(activeTimer))})`
    : null;

  if (needsDailyNoteDir) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="Daily Note Directory is not set"
          description="Daily Note mode reads tasks from your notes folder. Set the directory in the extension preferences, or switch Task Mode to Manual."
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search or type a new task..."
      onSearchTextChange={setSearchText}
      filtering={true}
      isLoading={lastTask === undefined}
    >
      {completedType === "pomodoro" && lastTask !== undefined && (
        <List.Section title="✅ Pomodoro complete, time to chill">
          <List.Item
            title={lastTaskLabel || "Task"}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            accessories={[{ tag: { value: "Done", color: Color.Green } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Start Break"
                  icon={Icon.Mug}
                  onAction={handleStartBreak}
                />
                {lastTask && (
                  <Action
                    title="Resume Task"
                    icon={Icon.Play}
                    onAction={handleResume}
                  />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {completedType === "break" && lastTask !== undefined && (
        <List.Section title="🍅 Break's over, let's get it">
          {lastTaskLabel ? (
            <List.Item
              title={`Resume "${lastTaskLabel}"`}
              icon={{ source: Icon.Play, tintColor: Color.Orange }}
              actions={
                <ActionPanel>
                  <Action
                    title="Resume Task"
                    icon={Icon.Play}
                    onAction={handleResume}
                  />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="Pick a task below to start"
              icon={{ source: Icon.ArrowDown, tintColor: Color.Orange }}
            />
          )}
        </List.Section>
      )}

      {timerDisplay && (
        <List.Section title="🍅 Running">
          <List.Item
            title={timerDisplay}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Timer"
                  icon={Icon.Stop}
                  onAction={handleStopTimer}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {searchText.trim().length > 0 && (
        <List.Section title="✏️ Ad-hoc">
          <List.Item
            title={`Start "${searchText.trim()}"`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Start Pomodoro"
                  icon={Icon.Play}
                  onAction={handleAdHocStart}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="☕ Break">
        <List.Item
          title={`Start ${breakDuration}min Break`}
          icon={Icon.Mug}
          actions={
            <ActionPanel>
              <Action
                title="Start Break"
                icon={Icon.Play}
                onAction={handleStartBreak}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {groups.filter((g) => g.tasks.length > 0).length === 0 && isManual && (
        <List.Section title="📝 Tasks">
          <List.Item
            title="No tasks yet — type above to add one"
            icon={Icon.Message}
          />
        </List.Section>
      )}

      {groups.filter((g) => g.tasks.length > 0).length === 0 && !isManual && (
        <List.Section title="📝 Tasks">
          <List.Item
            title="No tasks found in today's note"
            subtitle={getDailyNotePath(
              prefs.dailyNotePath,
              prefs.dailyNoteFormat,
            )}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {groups
        .filter((g) => g.tasks.length > 0)
        .map((group) => (
          <List.Section key={group.name} title={group.name}>
            {group.tasks.map((task, taskIdx) => (
              <TaskItem
                key={`${group.name}-${taskIdx}`}
                task={task}
                onStart={handleStartPomodoro}
                onMarkDone={handleMarkDone}
                onMarkSubtaskDone={handleMarkSubtaskDone}
                onRemove={isManual ? handleRemoveTask : undefined}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function TaskItem({
  task,
  onStart,
  onMarkDone,
  onMarkSubtaskDone,
  onRemove,
}: {
  task: Task;
  onStart: (task: Task, subtask?: string) => void;
  onMarkDone: (task: Task) => void;
  onMarkSubtaskDone: (task: Task, subtask: string) => void;
  onRemove?: (task: Task) => void;
}) {
  const icon = task.done ? Icon.CheckCircle : Icon.Circle;
  const titlePrefix = task.done ? "✅ " : "";

  const parentActions = (
    <ActionPanel>
      <Action
        title="Start Pomodoro"
        icon={Icon.Play}
        onAction={() => onStart(task)}
      />
      {!task.done && (
        <Action
          title="Mark as Done"
          icon={Icon.CheckCircle}
          onAction={() => onMarkDone(task)}
        />
      )}
      {onRemove && (
        <Action
          title="Remove Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => onRemove(task)}
        />
      )}
    </ActionPanel>
  );

  const parentItem = (
    <List.Item
      title={`${titlePrefix}${task.title}`}
      subtitle={`${task.pomodoros}p`}
      icon={icon}
      actions={parentActions}
    />
  );

  if (task.subtasks.length === 0) {
    return parentItem;
  }

  return (
    <>
      {parentItem}
      {task.subtasks.map((sub, idx) => (
        <List.Item
          key={idx}
          title={sub.done ? `  ↳ ✅ ${sub.title}` : `  ↳ ${sub.title}`}
          icon={sub.done ? Icon.CheckCircle : Icon.Dot}
          actions={
            <ActionPanel>
              <Action
                title="Start Pomodoro"
                icon={Icon.Play}
                onAction={() => onStart(task, sub.title)}
              />
              {!sub.done && (
                <Action
                  title="Mark as Done"
                  icon={Icon.CheckCircle}
                  onAction={() => onMarkSubtaskDone(task, sub.title)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </>
  );
}
