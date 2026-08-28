import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  completeSubtask,
  getActiveTimer,
  getTask,
  startTimer,
  stopTimer,
  uncompleteSubtask,
  withActiveTimer,
} from "../lib/sunsama-client";
import { reportError, runWithToast } from "../lib/errors";
import { formatElapsed } from "../lib/time";
import { xShortcut } from "../lib/shortcuts";
import { Subtask, Task } from "../lib/types";
import { EditSubtaskForm } from "./edit-subtask-form";
import { AddSubtasksForm } from "./add-subtasks-form";
import { SetTimeForm } from "./set-time-form";

interface Props {
  task: Task;
  /** Refresh the parent list when subtasks change. */
  onChanged: () => void;
}

function accessories(subtask: Subtask, now: number): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  if (subtask.isRunning) {
    const current = subtask.timerStart
      ? Math.floor((now - Date.parse(subtask.timerStart)) / 1000)
      : undefined;
    items.push({
      tag: {
        value: current === undefined ? "running" : formatElapsed(current),
        color: Color.Green,
      },
      icon: { source: Icon.Stopwatch, tintColor: Color.Green },
      tooltip: "Timer running",
    });
  }
  if (typeof subtask.timeEstimate === "number" && subtask.timeEstimate > 0) {
    items.push({ icon: Icon.Clock, text: `${subtask.timeEstimate}m` });
  }
  return items;
}

export function SubtasksList({ task, onChanged }: Props) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (id: string) => getTask(id),
    [task.id],
    {
      initialData: task,
      onError: (error) => reportError(error, "Failed to load subtasks"),
    },
  );
  // Fetched separately so the subtask list isn't gated on it.
  const { data: timer, revalidate: revalidateTimer } = useCachedPromise(
    getActiveTimer,
    [],
    { onError: () => undefined },
  );

  const current = withActiveTimer([data ?? task], timer ?? null)[0];
  const subtasks = current.subtasks;

  const [now, setNow] = useState(() => Date.now());
  const hasRunningTimer = subtasks.some((s) => s.timerStart);
  useEffect(() => {
    if (!hasRunningTimer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasRunningTimer]);

  function refresh() {
    revalidate();
    revalidateTimer();
    onChanged();
  }

  /** Run a mutation behind a toast and refresh both views when it succeeds. */
  async function run(
    labels: { pending: string; success: string; failure: string },
    action: () => Promise<unknown>,
  ) {
    if (await runWithToast(labels, action)) refresh();
  }

  async function onToggle(subtask: Subtask) {
    await run(
      {
        pending: subtask.completed ? "Marking incomplete…" : "Completing…",
        success: subtask.completed ? "Marked incomplete" : "Subtask completed",
        failure: "Failed to update subtask",
      },
      () =>
        subtask.completed
          ? uncompleteSubtask(task.id, subtask.id)
          : completeSubtask(task.id, subtask.id),
    );
  }

  async function onStartTimer(subtask: Subtask) {
    await run(
      {
        pending: "Starting timer…",
        success: "Timer started",
        failure: "Failed to start timer",
      },
      () => startTimer(task.id, subtask.id),
    );
  }

  async function onStopTimer(subtask: Subtask) {
    await run(
      {
        pending: "Stopping timer…",
        success: "Timer stopped",
        failure: "Failed to stop timer",
      },
      () => stopTimer(task.id, subtask.id),
    );
  }

  const doneCount = subtasks.filter((s) => s.completed).length;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={current.title}
      searchBarPlaceholder={`${doneCount}/${subtasks.length} subtasks complete`}
    >
      <List.EmptyView
        icon={Icon.PlusCircle}
        title="No subtasks"
        description="Add subtasks with ⌘N."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Subtasks"
              icon={Icon.PlusCircle}
              target={<AddSubtasksForm task={current} onSaved={refresh} />}
            />
          </ActionPanel>
        }
      />
      {subtasks.map((subtask) => (
        <List.Item
          key={subtask.id}
          icon={
            subtask.isRunning
              ? { source: Icon.Stopwatch, tintColor: Color.Green }
              : subtask.completed
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
          }
          title={subtask.title}
          accessories={accessories(subtask, now)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {subtask.isRunning ? (
                  <Action
                    title="Stop Timer"
                    icon={Icon.Stop}
                    onAction={() => onStopTimer(subtask)}
                  />
                ) : (
                  <Action
                    title="Start Timer"
                    icon={Icon.Stopwatch}
                    onAction={() => onStartTimer(subtask)}
                  />
                )}
                <Action
                  title={
                    subtask.completed
                      ? "Mark as Incomplete"
                      : "Mark as Completed"
                  }
                  icon={subtask.completed ? Icon.Circle : Icon.Check}
                  shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                  onAction={() => onToggle(subtask)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Subtask"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <EditSubtaskForm
                      taskId={task.id}
                      subtask={subtask}
                      onSaved={refresh}
                    />
                  }
                />
                <Action.Push
                  title="Add Subtasks"
                  icon={Icon.PlusCircle}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<AddSubtasksForm task={current} onSaved={refresh} />}
                />
                <Action.Push
                  title="Set Planned Time"
                  icon={Icon.Clock}
                  shortcut={xShortcut("p", "shift")}
                  target={
                    <SetTimeForm
                      taskId={task.id}
                      subtaskId={subtask.id}
                      title={subtask.title}
                      currentMinutes={subtask.timeEstimate ?? 0}
                      onSaved={refresh}
                    />
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
