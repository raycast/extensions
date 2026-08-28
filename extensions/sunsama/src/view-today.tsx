import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { xShortcut } from "./lib/shortcuts";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  completeTask,
  DayTasks,
  deleteTask,
  getActiveTimer,
  getTasksForDay,
  withActiveTimer,
  reorderDay,
  rescheduleTask,
  startTimer,
  stopTimer,
  subtasksWithPlannedTime,
} from "./lib/sunsama-client";
import { signOut } from "./lib/mcp";
import { addDays, nextMonday, todayString, toDayString } from "./lib/date";
import { reportError, runWithToast } from "./lib/errors";
import { formatDuration, formatElapsed } from "./lib/time";
import { Task } from "./lib/types";
import { EditTaskForm } from "./components/edit-task-form";
import { AddSubtasksForm } from "./components/add-subtasks-form";
import { SubtasksList } from "./components/subtasks-list";
import { SetTimeForm } from "./components/set-time-form";
import { openIntegration } from "./lib/open-integration";

// A dimmer, semi-transparent grey for the "nothing left to do" sun. Raycast
// boosts low-contrast tints back up by default, which would undo the
// transparency, so adjustContrast is turned off.
const DONE_TINT = {
  light: "rgba(0, 0, 0, 0.35)",
  dark: "rgba(255, 255, 255, 0.3)",
  adjustContrast: false,
};

/** Action label for a task's integration link, e.g. "Open in Trello". */
function integrationLabel(service?: string): string {
  const names: Record<string, string> = {
    trello: "Trello",
    github: "GitHub",
    slack: "Slack",
    gmail: "Gmail",
    linear: "Linear",
    clickup: "ClickUp",
    todoist: "Todoist",
    website: "Browser",
  };
  const name = service ? names[service] : undefined;
  return name ? `Open in ${name}` : "Open Link";
}

function accessories(task: Task, now: number): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  if (task.channelName) {
    items.push({
      tag: { value: task.channelName, color: Color.SecondaryText },
      tooltip: "Channel",
    });
  }
  if (task.startTime) {
    items.push({
      icon: Icon.Calendar,
      text: task.startTime,
      tooltip: "Scheduled start",
    });
  }
  if (task.isRunning) {
    // Tracked total plus the live session, when the server reports its start.
    // Without a start we can only show the total — still green, to signal that
    // the timer is running.
    const current = task.timerStart
      ? Math.floor((now - Date.parse(task.timerStart)) / 1000)
      : 0;
    items.push({
      tag: {
        value: formatElapsed(task.trackedSeconds + current),
        color: Color.Green,
      },
      icon: { source: Icon.Stopwatch, tintColor: Color.Green },
      tooltip: "Timer running",
    });
  } else if (task.trackedSeconds > 0) {
    items.push({
      tag: {
        value: formatElapsed(task.trackedSeconds),
        color: Color.SecondaryText,
      },
      icon: { source: Icon.Stopwatch, tintColor: Color.SecondaryText },
    });
  }
  if (task.subtasks.length) {
    const done = task.subtasks.filter((s) => s.completed).length;
    items.push({
      icon: Icon.CheckCircle,
      text: `${done}/${task.subtasks.length}`,
    });
  }
  if (typeof task.timeEstimate === "number" && task.timeEstimate > 0) {
    items.push({ icon: Icon.Clock, text: formatDuration(task.timeEstimate) });
  }
  return items;
}

export default function ViewToday() {
  const day = todayString();
  // useCachedPromise paints the last-seen tasks instantly on open, then
  // revalidates in the background (top loading bar) — no waiting for a fetch.
  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    getTasksForDay,
    [day],
    { onError: (error) => reportError(error, "Failed to load tasks") },
  );
  // Separate request so the list paints as soon as the tasks land; the timer
  // only decorates rows. Failing to read it must not empty the list.
  const { data: timer, revalidate: revalidateTimer } = useCachedPromise(
    getActiveTimer,
    [],
    { onError: () => undefined },
  );

  const { showCompleted } = getPreferenceValues<Preferences.ViewToday>();
  // getTasksForDay already returns Sunsama's day order; just optionally hide
  // completed tasks. `allIds` covers every task on the day — including ones
  // hidden from the list — and every reorder has to send that whole set.
  const ordered = withActiveTimer(data?.tasks ?? [], timer ?? null);
  const allIds = data?.allIds ?? [];
  const tasks = ordered.filter((t) => showCompleted || !t.completed);

  // Tick every second while any task has a running timer, so the elapsed
  // indicator stays live without refetching.
  const [searchText, setSearchText] = useState("");
  const [now, setNow] = useState(() => Date.now());
  // Only tick when there's a session start to count from; a running timer with
  // no known start has nothing to animate.
  const hasRunningTimer = tasks.some((t) => t.timerStart);
  useEffect(() => {
    if (!hasRunningTimer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasRunningTimer]);

  /**
   * Run a mutation behind a toast. `optimistic` applies the change to the
   * cached day straight away so the list reacts immediately instead of waiting
   * on the refetch, which takes a couple of seconds. `mutate` rolls the change
   * back automatically if the request fails, and revalidates once it lands.
   */
  async function run(
    labels: { pending: string; success: string; failure: string },
    action: () => Promise<unknown>,
    optimistic?: (day: DayTasks) => DayTasks,
  ) {
    const ok = await runWithToast(labels, () =>
      mutate(
        action(),
        optimistic
          ? { optimisticUpdate: (d) => (d ? optimistic(d) : d) }
          : undefined,
      ),
    );
    if (ok) revalidateTimer();
  }

  /** Replace one task in the cached day. */
  const patchTask =
    (id: string, change: (task: Task) => Task) => (d: DayTasks) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? change(t) : t)),
    });

  /** Drop a task from the cached day entirely. */
  const dropTask = (id: string) => (d: DayTasks) => ({
    tasks: d.tasks.filter((t) => t.id !== id),
    allIds: d.allIds.filter((taskId) => taskId !== id),
  });

  async function onComplete(task: Task) {
    await run(
      {
        pending: "Completing…",
        success: "Task completed",
        failure: "Failed to complete task",
      },
      () => completeTask(task.id),
      patchTask(task.id, (t) => ({ ...t, completed: true })),
    );
  }

  async function onStartTimer(task: Task) {
    await run(
      {
        pending: "Starting timer…",
        success: "Timer started",
        failure: "Failed to start timer",
      },
      () => startTimer(task.id),
    );
  }

  async function onStopTimer(task: Task) {
    // The running timer may be the task's own or one of its subtasks (e.g.
    // started from the Sunsama web app). Stop whichever is actually running.
    const runningSubtask = task.ownTimerRunning
      ? undefined
      : task.subtasks.find((s) => s.isRunning);
    await run(
      {
        pending: "Stopping timer…",
        success: "Timer stopped",
        failure: "Failed to stop timer",
      },
      () => stopTimer(task.id, runningSubtask?.id),
    );
  }

  /** Apply a reordered id list for the day (ids in display order). */
  async function applyOrder(ids: string[], success: string) {
    await run(
      { pending: "Moving…", success, failure: "Failed to move task" },
      () => reorderDay(day, ids),
      (d) => ({
        allIds: ids,
        tasks: [...d.tasks].sort(
          (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id),
        ),
      }),
    );
  }

  async function onMove(task: Task, direction: -1 | 1) {
    // Take the adjacent visible task's slot, positioned within the full day
    // order so hidden tasks keep their places.
    const visibleIndex = tasks.findIndex((t) => t.id === task.id);
    const neighbor = tasks[visibleIndex + direction];
    if (!neighbor) return;

    const ids = [...allIds];
    const from = ids.indexOf(task.id);
    const to = ids.indexOf(neighbor.id);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, task.id);
    await applyOrder(ids, "Task moved");
  }

  async function onMoveTo(task: Task, edge: "top" | "bottom") {
    const ids = allIds.filter((id) => id !== task.id);
    if (edge === "top") ids.unshift(task.id);
    else ids.push(task.id);
    await applyOrder(ids, edge === "top" ? "Moved to top" : "Moved to bottom");
  }

  /** Snooze a task to another day. `target` is YYYY-MM-DD. */
  async function onSnooze(task: Task, target: string, label: string) {
    await run(
      {
        pending: "Snoozing…",
        success: `Snoozed to ${label}`,
        failure: "Failed to snooze task",
      },
      () => rescheduleTask(task.id, target),
      // It belongs to another day now, so it leaves this list.
      dropTask(task.id),
    );
  }

  /** Clear stored credentials so the next run re-runs the sign-in flow. */
  async function onSignOut() {
    const confirmed = await confirmAlert({
      title: "Sign out of Sunsama?",
      message:
        "Stored credentials are removed. The next command run will ask you to sign in again.",
      icon: { source: Icon.Logout, tintColor: Color.Red },
      primaryAction: {
        title: "Sign Out",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await run(
      {
        pending: "Signing out…",
        success: "Signed out",
        failure: "Failed to sign out",
      },
      signOut,
    );
  }

  async function onDelete(task: Task) {
    const confirmed = await confirmAlert({
      title: "Delete task?",
      message: task.title,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await run(
      {
        pending: "Deleting…",
        success: "Task deleted",
        failure: "Failed to delete task",
      },
      () => deleteTask(task.id),
      dropTask(task.id),
    );
  }

  const isSearching = searchText.trim().length > 0;
  // Everything on the day is finished. With completed tasks hidden the list is
  // simply empty and the empty view says so; with them shown, the items are
  // still there, so the news goes in a section header above them.
  const allComplete = ordered.length > 0 && ordered.every((t) => t.completed);

  const items = tasks.map((task) => (
    <List.Item
      key={task.id}
      icon={
        task.isRunning
          ? { source: Icon.Stopwatch, tintColor: Color.Green }
          : task.completed
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      title={task.title}
      accessories={accessories(task, now)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {task.isRunning ? (
              <Action
                title="Stop Timer"
                icon={Icon.Stop}
                onAction={() => onStopTimer(task)}
              />
            ) : (
              <Action
                title="Start Timer"
                icon={Icon.Stopwatch}
                onAction={() => onStartTimer(task)}
              />
            )}
            {!task.completed && (
              <Action
                title="Mark as Completed"
                icon={Icon.Check}
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                onAction={() => onComplete(task)}
              />
            )}
            {task.subtasks.length > 0 && (
              <Action.Push
                title="View Subtasks"
                icon={Icon.List}
                shortcut={xShortcut("u", "shift")}
                target={<SubtasksList task={task} onChanged={revalidate} />}
              />
            )}
            <Action.Push
              title="Add Subtasks"
              icon={Icon.PlusCircle}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<AddSubtasksForm task={task} onSaved={revalidate} />}
            />
            <Action.Push
              title="Edit Task"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <EditTaskForm task={task} day={day} onSaved={revalidate} />
              }
            />
            {task.integrationUrl && (
              <Action
                title={integrationLabel(task.integrationService)}
                icon={Icon.Link}
                shortcut={xShortcut("i", "shift")}
                onAction={() =>
                  openIntegration(
                    task.integrationUrl as string,
                    task.integrationService,
                  )
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Submenu
              title="Snooze…"
              icon={Icon.Moon}
              shortcut={xShortcut("s", "shift")}
            >
              <Action
                title="Tomorrow"
                icon={Icon.Sun}
                onAction={() => onSnooze(task, addDays(day, 1), "tomorrow")}
              />
              <Action
                title="Next Week"
                icon={Icon.Calendar}
                onAction={() => onSnooze(task, nextMonday(day), "next week")}
              />
              <Action.PickDate
                title="Pick a Day…"
                icon={Icon.Calendar}
                type={Action.PickDate.Type.Date}
                min={new Date()}
                onChange={(date) => {
                  if (!date) return;
                  const target = toDayString(date);
                  onSnooze(task, target, target);
                }}
              />
            </ActionPanel.Submenu>
            <Action
              title="Move up"
              icon={Icon.ArrowUp}
              shortcut={Keyboard.Shortcut.Common.MoveUp}
              onAction={() => onMove(task, -1)}
            />
            <Action
              title="Move Down"
              icon={Icon.ArrowDown}
              shortcut={Keyboard.Shortcut.Common.MoveDown}
              onAction={() => onMove(task, 1)}
            />
            <Action
              title="Move to Top"
              icon={Icon.ArrowUpCircle}
              shortcut={xShortcut("arrowUp", "opt", "shift")}
              onAction={() => onMoveTo(task, "top")}
            />
            <Action
              title="Move to Bottom"
              icon={Icon.ArrowDownCircle}
              shortcut={xShortcut("arrowDown", "opt", "shift")}
              onAction={() => onMoveTo(task, "bottom")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Set Planned Time"
              icon={Icon.Clock}
              shortcut={xShortcut("p", "shift")}
              target={
                <SetTimeForm
                  taskId={task.id}
                  title={task.title}
                  currentMinutes={task.timeEstimate ?? 0}
                  clearSubtaskIds={subtasksWithPlannedTime(task)}
                  onSaved={revalidate}
                />
              }
            />
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => onDelete(task)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <Action
              title="Sign out of Sunsama"
              icon={Icon.Logout}
              onAction={onSignOut}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  ));

  return (
    <List
      isLoading={isLoading || data === undefined}
      searchBarPlaceholder="Filter today's tasks"
      onSearchTextChange={setSearchText}
      filtering
    >
      {isSearching ? (
        <List.EmptyView
          icon={Icon.Sun}
          title="No tasks found"
          description="Maybe it's hiding in another day, or the backlog."
        />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Sun, tintColor: DONE_TINT }}
          title="Done for the day"
        />
      )}
      {allComplete ? (
        <List.Section
          title="Done for the day"
          subtitle={`${ordered.length} completed`}
        >
          {items}
        </List.Section>
      ) : (
        items
      )}
    </List>
  );
}
