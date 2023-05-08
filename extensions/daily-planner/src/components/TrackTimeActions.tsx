import { Action, ActionPanel, confirmAlert, getPreferenceValues, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { timeTracker } from "../api/time-tracker";
import { updateTodo } from "../api/todo-source";
import {
  callFunctionShowingToasts,
  findRunningTimeEntry,
  updateStartDateOnListChange,
  updateTimeEntry,
} from "../helpers/actions";
import { shortcut } from "../helpers/shortcut";
import { isTodoItem, TaskBlockItem, TodoItem } from "../helpers/todoList";
import { TimeEntry, TodoSourceId, TodoStatus } from "../types";

interface StopTimerProps {
  timeEntry: TimeEntry;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
  timeEntryTodoItem?: TodoItem;
  revalidateTodos?: (sourceId?: TodoSourceId) => Promise<void>;
}

const { isSyncingProjects, isSyncingTags, isReschedulingOnTimeTracking } = getPreferenceValues<{
  isSyncingProjects: boolean;
  isSyncingTags: boolean;
  isReschedulingOnTimeTracking: boolean;
}>();

async function markTodoAsCompleted(todoItem?: TodoItem, revalidateTodos?: (sourceId?: TodoSourceId) => Promise<void>) {
  if (todoItem) {
    const { sourceId, todoId } = todoItem;
    await updateTodo[sourceId](todoId, { status: TodoStatus.completed });
    if (revalidateTodos) {
      await revalidateTodos(todoItem.sourceId);
    }
  }
}

function StartTimerAction({
  item,
  revalidateTimeEntries,
  mutateTimeEntries,
  isTimerRunning,
  runningTimeEntryTodoItem,
  revalidateTodos,
}: {
  item: TodoItem | TaskBlockItem;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
  isTimerRunning: boolean;
  runningTimeEntryTodoItem: TodoItem | null | undefined;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
}): JSX.Element {
  async function startTimer() {
    if (
      isTimerRunning &&
      !(await confirmAlert({
        icon: Icon.Stopwatch,
        title: "Running Time Entry",
        message: "Are you sure you want to stop the running timer and start a new one?",
      }))
    ) {
      return;
    }

    await callFunctionShowingToasts({
      async fn() {
        if (timeTracker === null) {
          throw new Error("`timeTracker` missing");
        }

        await Promise.all([
          updateTimeEntry(
            timeTracker.startTimer(item.url, {
              description: item.title,
              projectName:
                isSyncingProjects && isTodoItem(item) && item.group?.type === "project" ? item.group.title : undefined,
              tagNames: isSyncingTags && isTodoItem(item) ? item.tags?.map(({ name }) => name) : undefined,
            }),
            {
              optimisticUpdate(data) {
                // The fake id & workspaceId will cause an error if this is passed to `stopTimer()` before the real one.
                return data.concat({
                  id: "optimistic",
                  title: item.title,
                  start: Date.now(),
                  end: null,
                  workspaceId: "temp",
                });
              },
              mutateTimeEntries,
              revalidateTimeEntries,
              url: item.url,
            }
          ),

          isReschedulingOnTimeTracking && isTodoItem(item)
            ? updateStartDateOnListChange(item, new Date(), revalidateTodos)
            : Promise.resolve(),
        ]);
      },
      initTitle: "Starting timer",
      successTitle: "Started timer",
      successMessage: `"${item.title}" is now being tracked.`,
      successPrimaryAction: runningTimeEntryTodoItem
        ? {
            title: `Mark "${runningTimeEntryTodoItem.title}" as Completed`,
            async onAction() {
              await markTodoAsCompleted(runningTimeEntryTodoItem, revalidateTodos);
            },
          }
        : undefined,
      failureTitle: "Failed to start timer",
    });
  }
  return (
    <Action icon={Icon.Play} title="Start Timer" shortcut={shortcut.startTimer} onAction={() => void startTimer()} />
  );
}

export async function stopTimer({
  timeEntry,
  revalidateTimeEntries,
  mutateTimeEntries,
  timeEntryTodoItem,
  revalidateTodos,
}: StopTimerProps) {
  await callFunctionShowingToasts({
    async fn() {
      if (timeTracker === null) {
        throw new Error("`timeTracker` missing");
      }

      await Promise.all([
        updateTimeEntry(timeTracker.stopTimer(timeEntry), {
          optimisticUpdate(data) {
            return data.map((entry) => (entry.id === timeEntry.id ? { ...entry, end: Date.now() } : entry));
          },
          mutateTimeEntries,
          revalidateTimeEntries,
        }),

        // Mark the associated to-do as completed, if `timeEntryTodoItem`.
        markTodoAsCompleted(timeEntryTodoItem, revalidateTodos),
      ]);
    },
    initTitle: "Stopping timer",
    successTitle: "Stopped timer",
    successMessage: `"${timeEntry.title}" is no longer tracked.`,
    failureTitle: "Failed to stop running timer",
  });
}

export function StopTimerAction(props: StopTimerProps): JSX.Element {
  return (
    <Action
      icon={Icon.Stop}
      title={props.timeEntryTodoItem ? "Stop Timer & Complete Todo" : "Stop Timer"}
      shortcut={props.timeEntryTodoItem ? shortcut.stopTimerAndCompleteToDo : shortcut.stopTimer}
      onAction={() => void stopTimer(props)}
    />
  );
}

export default function TrackTimeActions({
  item,
  isTimerRunning,
  runningTimeEntryTodoItem,
  revalidateTodos,
  revalidateTimeEntries,
  mutateTimeEntries,
}: {
  item: TodoItem | TaskBlockItem;
  isTimerRunning: boolean;
  runningTimeEntryTodoItem?: TodoItem;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
}) {
  const itemRunningTimeEntry = findRunningTimeEntry(item.tracked?.items);

  return (
    <ActionPanel.Section>
      {itemRunningTimeEntry ? (
        <>
          <StopTimerAction
            timeEntry={itemRunningTimeEntry}
            revalidateTimeEntries={revalidateTimeEntries}
            mutateTimeEntries={mutateTimeEntries}
          />

          {isTodoItem(item) ? (
            <StopTimerAction
              timeEntry={itemRunningTimeEntry}
              revalidateTimeEntries={revalidateTimeEntries}
              mutateTimeEntries={mutateTimeEntries}
              timeEntryTodoItem={item}
              revalidateTodos={revalidateTodos}
            />
          ) : null}
        </>
      ) : (
        <StartTimerAction
          item={item}
          revalidateTimeEntries={revalidateTimeEntries}
          mutateTimeEntries={mutateTimeEntries}
          isTimerRunning={isTimerRunning}
          runningTimeEntryTodoItem={runningTimeEntryTodoItem}
          revalidateTodos={revalidateTodos}
        />
      )}
    </ActionPanel.Section>
  );
}
