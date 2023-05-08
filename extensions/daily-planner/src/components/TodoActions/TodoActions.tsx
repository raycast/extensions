import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  useNavigation,
} from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { addDays } from "date-fns";
import { deleteBlocks } from "../../api/eventkit";
import { timeTracker } from "../../api/time-tracker";
import {
  deleteTodo,
  enabledAction,
  getURLs,
  priorityNameAndColor,
  todoSourceApplicationName,
  updateTodo,
  UpdateTodoData,
} from "../../api/todo-source";
import { callFunctionShowingToasts, findRunningTimeEntry, updateTimeEntry } from "../../helpers/actions";
import { endOfToday, formatRelativeDateOnly, fourteenDayInterval } from "../../helpers/datetime";
import { shortcut } from "../../helpers/shortcut";
import { TodoItem, todoState } from "../../helpers/todoList";
import { todoSourceIcon } from "../../helpers/todoListIcons";
import {
  Block,
  CalendarEvent,
  TimeEntry,
  TimeEntryIdType,
  Todo,
  TodoGroup,
  TodoSourceId,
  TodoStatus,
} from "../../types";
import EditTodoForm from "../EditTodoForm";
import MoveSubmenu from "./MoveSubmenu";
import TagSubmenu from "./TagSubmenu";

export interface UpdateTodoParams<T = void> {
  data: Partial<UpdateTodoData>;
  prerequisiteIds?: Todo["todoId"][];
  sideEffect?: Promise<T | undefined>;
  initTitle: string;
  successTitle: string;
  successMessage?: string | ((result: T | undefined) => string);
  failureTitle: string;
  withPop?: boolean;
}

const { blockCalendar } = getPreferenceValues<{ blockCalendar: string }>();

export default function TodoActions({
  isTodayList,
  getCreateTodoAction,
  todoItem,
  tieredTodoGroups,
  todoTags,
  revalidateTodos,
  revalidateBlocks,
  revalidateUpcomingEvents,
  revalidateTimeEntries,
  mutateTimeEntries,
  mutateDetailTimeEntries,
  getDetail,
}: {
  isTodayList: boolean;
  getCreateTodoAction: () => JSX.Element;
  todoItem: TodoItem;
  tieredTodoGroups: TodoGroup[] | undefined;
  todoTags: Map<string, string> | undefined;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateBlocks: () => Promise<Block[]>;
  revalidateUpcomingEvents: (() => Promise<CalendarEvent[]>) | undefined;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
  mutateDetailTimeEntries?: MutatePromise<TimeEntry[]> | undefined;
  getDetail?: () => JSX.Element;
}): JSX.Element {
  const { pop } = useNavigation();

  const updateTodoFn = updateTodo[todoItem.sourceId];

  async function updateTodoItem<T = void>({
    data,
    prerequisiteIds,
    sideEffect,
    initTitle,
    successTitle,
    successMessage,
    failureTitle,
    withPop,
  }: UpdateTodoParams<T>): Promise<void> {
    await callFunctionShowingToasts({
      async fn() {
        if (prerequisiteIds) {
          await Promise.all(prerequisiteIds.map((todoId) => updateTodoFn(todoId, data)));
        }

        await updateTodoFn(todoItem.todoId, data);

        const results = await Promise.all([
          revalidateTodos(todoItem.sourceId),
          sideEffect ? sideEffect : Promise.resolve(undefined),
        ]);

        if (!getDetail && withPop) {
          pop();
        }

        return results[1];
      },
      initTitle,
      successTitle,
      successMessage,
      failureTitle,
      withPop,
    });
  }

  // Sets `startDate`, or, if unavailable, `dueDate`
  async function setStartDate(newValue: Date | null) {
    // Keep `successMessage` short so Command-T doesn't conflict with the showToast keyboard shortcut.
    await updateTodoItem({
      data: { startDate: newValue },
      initTitle: newValue ? "Setting start date" : "Removing start date",
      successTitle: newValue ? "Set start date" : "Removed start date",
      successMessage: newValue ? `to ${formatRelativeDateOnly(newValue)}` : "",
      failureTitle: "Failed to set start date",
    });
  }

  async function setDueDate(newValue: Date | null) {
    // Keep `successMessage` short so Command-T doesn't conflict with the showToast keyboard shortcut.
    await updateTodoItem({
      data: { dueDate: newValue },
      initTitle: newValue ? "Setting due date" : "Removing due date",
      successTitle: newValue ? "Set due date" : "Removed due date",
      successMessage: newValue ? `to ${formatRelativeDateOnly(newValue)}` : "",
      failureTitle: "Failed to set due date",
    });
  }

  async function updateStatus(newValue: Todo["status"]) {
    const itemRunningTimeEntry = findRunningTimeEntry(todoItem.tracked?.items);

    const timerUpdate =
      [TodoStatus.completed, TodoStatus.canceled].includes(newValue) &&
      itemRunningTimeEntry &&
      (revalidateTimeEntries || mutateTimeEntries) &&
      timeTracker !== null &&
      (await confirmAlert({
        icon: Icon.Stopwatch,
        title: "To-do in Progress",
        message: `After marking this to-do as ${TodoStatus[newValue]}, do you also want to stop the running timer?`,
        primaryAction: { title: "Stop Timer" },
        dismissAction: { title: "Don't Stop Timer" },
      }))
        ? timeTracker.stopTimer(itemRunningTimeEntry)
        : undefined;

    await Promise.all([
      updateTodoItem({
        data: { status: newValue },
        initTitle: `Marking "${todoItem.title}" as ${TodoStatus[newValue]}`,
        successTitle: "Marked as " + TodoStatus[newValue],
        successMessage: `${todoItem.title} ${TodoStatus[newValue]}`,
        failureTitle: `Failed to mark "${todoItem.title}" as ${TodoStatus[newValue]}`,
        withPop: true,
      }),

      timerUpdate
        ? updateTimeEntry(timerUpdate, {
            optimisticUpdate(data) {
              return data.map((entry) =>
                entry.id === itemRunningTimeEntry?.id ? { ...entry, end: Date.now() } : entry
              );
            },
            mutateTimeEntries,
            mutateDetailTimeEntries,
            revalidateTimeEntries,
          })
        : Promise.resolve(),
    ]);
  }

  async function setPriority(newValue: string, priorityName: string) {
    await updateTodoItem({
      data: { priority: parseInt(newValue) },
      initTitle: "Setting priority",
      successTitle: "Set priority",
      successMessage: `"${todoItem.title}" is now ${priorityName}`,
      failureTitle: "Failed to set priority",
    });
  }

  async function deleteTodoItem() {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Delete To-Do",
      message: "Are you sure you want to delete this to-do?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      // This alert was initially shown only when `todoItem.blocked || todoItem.tracked`, but there might be events
      // and time entries that weren't fetched depending on the fetch interval. Best to delete them all.
      const alsoDeleteEventsAndEntries = await confirmAlert({
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: "Delete Blocks & Time Entries",
        message: "Do you want to also delete any blocks and time entries linked to this to-do?",
        primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
        dismissAction: { title: "Delete To-Do Only" },
      });

      await callFunctionShowingToasts({
        async fn() {
          await deleteTodo[todoItem.sourceId](todoItem.todoId);

          return await Promise.all([
            revalidateTodos(todoItem.sourceId),

            alsoDeleteEventsAndEntries
              ? (async () => {
                  const urls = getURLs(todoItem.id);
                  const deletedBlockIds = await deleteBlocks(urls, blockCalendar, fourteenDayInterval);
                  if (revalidateUpcomingEvents) {
                    await revalidateUpcomingEvents();
                  }
                  return deletedBlockIds.length;
                })()
              : Promise.resolve(0),

            alsoDeleteEventsAndEntries && timeTracker !== null
              ? updateTimeEntry(timeTracker.deleteTimeEntries(todoItem.id), {
                  optimisticUpdate(data) {
                    return data.filter(({ title }) => title !== todoItem.title);
                  },
                  mutateTimeEntries,
                  revalidateTimeEntries,
                })
              : Promise.resolve(0),
          ]);
        },
        initTitle: `Deleting "${todoItem.title}"`,
        successTitle: `Deleted "${todoItem.title}"`,
        successMessage: alsoDeleteEventsAndEntries
          ? (counts: [unknown, number, TimeEntryIdType[] | undefined]) =>
              `${counts[1]} blocks and ${counts[2]?.length ?? 0} time entries were also deleted.`
          : undefined,
        failureTitle: `Failed to delete ${todoItem.title}`,
        withPop: true,
      });
    }
  }

  async function refresh() {
    await Promise.all([
      revalidateTodos(),
      revalidateBlocks(),
      revalidateUpcomingEvents ? revalidateUpcomingEvents() : Promise.resolve(),
      revalidateTimeEntries ? revalidateTimeEntries() : Promise.resolve(),
    ]);
  }

  const hasStartDate = enabledAction[todoItem.sourceId].setStartDate;
  const dateAction = hasStartDate ? "Start" : "Set Due Date to";
  const todoSourcePriority = priorityNameAndColor[todoItem.sourceId];

  return (
    <>
      {!isTodayList && (!todoItem.startDate || todoItem.startDate > endOfToday) ? (
        <Action
          icon={Icon.Star}
          title={dateAction + " Today"}
          shortcut={shortcut.startToday}
          onAction={() => (hasStartDate ? void setStartDate(new Date()) : void setDueDate(new Date()))}
        />
      ) : null}

      {isTodayList || !todoItem.startDate || todoItem.startDate <= endOfToday ? (
        <Action
          icon={{ source: { light: "light/calendar-alt-arrow-right.svg", dark: "dark/calendar-alt-arrow-right.svg" } }}
          title={dateAction + " Tomorrow"}
          shortcut={shortcut.startTomorrow}
          onAction={() =>
            hasStartDate ? void setStartDate(addDays(Date.now(), 1)) : void setDueDate(addDays(Date.now(), 1))
          }
        />
      ) : null}

      {hasStartDate ? (
        <Action.PickDate
          type={Action.PickDate.Type.Date}
          icon={{ source: { light: "light/calendar-alt.svg", dark: "dark/calendar-alt.svg" } }}
          title="When"
          shortcut={shortcut.pickStartDate}
          onChange={(date) => void setStartDate(date)}
        />
      ) : null}

      <Action.PickDate
        type={Action.PickDate.Type.Date}
        icon={Icon.Flag}
        title="Due Date"
        shortcut={shortcut.pickDueDate}
        onChange={(date) => void setDueDate(date)}
      />

      <ActionPanel.Section>
        {getDetail ? (
          <Action.Push icon={Icon.Sidebar} title="Show Details" shortcut={shortcut.showDetails} target={getDetail()} />
        ) : null}

        <Action.Open
          icon={{ source: todoSourceIcon[todoItem.sourceId] }}
          title={"Open in " + todoSourceApplicationName[todoItem.sourceId]}
          target={todoItem.url}
          application={todoSourceApplicationName[todoItem.sourceId]}
          shortcut={shortcut.openInApp}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Manage To-Do">
        <Action.Push
          title="Edit"
          icon={Icon.Pencil}
          shortcut={shortcut.editTodo}
          target={
            <EditTodoForm
              todoItem={todoItem}
              tieredTodoGroups={tieredTodoGroups}
              todoTags={todoTags}
              revalidateTodos={revalidateTodos}
              revalidateUpcomingEvents={revalidateUpcomingEvents}
              revalidateTimeEntries={revalidateTimeEntries}
              mutateTimeEntries={mutateTimeEntries}
            />
          }
        />

        {enabledAction[todoItem.sourceId].setPriority && todoSourcePriority ? (
          <ActionPanel.Submenu icon={Icon.Exclamationmark3} title="Priority" shortcut={shortcut.setPriority}>
            {Object.entries(todoSourcePriority).map(([key, { name, color, icon }]) => (
              <Action
                key={key}
                icon={{ source: icon, tintColor: color }}
                title={name}
                onAction={() => void setPriority(key, name)}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}

        <MoveSubmenu todoItem={todoItem} tieredTodoGroups={tieredTodoGroups} updateTodo={updateTodoItem} />

        <TagSubmenu todoItem={todoItem} todoTags={todoTags} updateTodo={updateTodoItem} />

        <Action
          title={todoItem.state !== todoState.completed ? "Mark as Completed" : "Mark as Incomplete"}
          icon={todoItem.state !== todoState.completed ? Icon.Checkmark : Icon.Circle}
          shortcut={shortcut.complete}
          onAction={() =>
            void updateStatus(todoItem.state !== todoState.completed ? TodoStatus.completed : TodoStatus.open)
          }
        />

        {enabledAction[todoItem.sourceId].markAsCanceled ? (
          <Action
            title="Mark as Canceled"
            icon={Icon.XMarkCircle}
            shortcut={shortcut.cancel}
            onAction={() => void updateStatus(TodoStatus.canceled)}
          />
        ) : null}

        <Action
          title="Delete"
          icon={Icon.Trash}
          shortcut={shortcut.deleteTodo}
          onAction={() => void deleteTodoItem()}
          style={Action.Style.Destructive}
        />
      </ActionPanel.Section>

      {getCreateTodoAction()}

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy To-Do Title"
          content={todoItem.title}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          title="Copy To-Do ID"
          content={todoItem.todoId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />

        <Action.CopyToClipboard
          title="Copy To-Do URL"
          content={todoItem.url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "/" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => void refresh()}
        />

        <Action.OpenInBrowser
          title="Open Documentation"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["shift", "cmd"], key: "h" }}
          url="https://benyn.github.io/raycast-daily-planner/block-time"
        />
      </ActionPanel.Section>
    </>
  );
}
