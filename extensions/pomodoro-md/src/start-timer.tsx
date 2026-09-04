import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  List,
  confirmAlert,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Task } from "./parser";
import { getAppPreferences } from "./preferences";
import {
  TaskSource,
  TaskGroup,
  createTaskSource,
  getTaskMode,
} from "./task-source";
import {
  TimerState,
  startTimer,
  startBreak,
  getLastLog,
  getRemainingMs,
  formatRemaining,
} from "./timer";
import {
  CompletedType,
  CompletionContext,
  completedTypeOf,
  settle,
  finish,
  stopRunning,
} from "./session";

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
  const { pomoDuration, breakDuration } = getAppPreferences();

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

  // Re-run when relaunched with a new completion context while already open.
  useEffect(() => {
    setCompletedType(completion?.completedType);
    taskSource.getTasks().then(setGroups);
    settle().then(async ({ running, finished }) => {
      setActiveTimer(running);
      // Opened directly (not via the menu bar) after a session ran out:
      // show the completion prompt just the same.
      if (finished) setCompletedType(completedTypeOf(finished));
      const last = await getLastLog();
      setLastTask(
        last
          ? { taskTitle: last.taskTitle, subtaskTitle: last.subtaskTitle }
          : null,
      );
    });
  }, [completion]);

  async function handleStartPomodoro(task: Task, subtaskTitle?: string) {
    const { running } = await settle();
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
    // A running break is simply dropped; a pomodoro is logged as stopped early.
    if (running) await finish(running, false);

    const label = subtaskTitle || task.title;
    await startTimer(task.title, minutes, subtaskTitle);
    await showHUD(`🍅 ${label} — ${Math.ceil(minutes)}min`);
  }

  async function handleStartBreak() {
    await stopRunning();
    await startBreak(breakDuration);
    setCompletedType(undefined);
    await showHUD(`☕ Break — ${breakDuration}min`);
  }

  async function handleResume() {
    if (!lastTask) return;
    await stopRunning();
    await startTimer(lastTask.taskTitle, pomoDuration, lastTask.subtaskTitle);
    setCompletedType(undefined);
    const label = lastTask.subtaskTitle || lastTask.taskTitle;
    await showHUD(`🍅 ${label} — ${pomoDuration}min`);
  }

  async function handleStopTimer() {
    await stopRunning();
    await showToast({ style: Toast.Style.Success, title: "Timer stopped" });
    setActiveTimer(null);
  }

  async function handleMarkDone(task: Task) {
    if (taskSource.markDone) {
      await taskSource.markDone(task.title);
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
      await taskSource.markSubtaskDone(task.title, subtaskTitle);
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
      await taskSource.removeTask(task.title);
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
      await taskSource.addTask(title);
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
