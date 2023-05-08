import {
  Action,
  ActionPanel,
  confirmAlert,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { timeTrackerErrorPref } from "./api/time-tracker";
import ScopedPermissionView from "./components/ScopedPermissionView";
import TaskBlockActions from "./components/TaskBlockActions";
import TodoList from "./components/TodoList";
import TodoListDropdown, { initialList } from "./components/TodoListDropdown";
import TrackTimeActions, { stopTimer } from "./components/TrackTimeActions";
import { findRunningTimeEntry } from "./helpers/actions";
import { startOfToday, today, todayAndNextSevenDays } from "./helpers/datetime";
import { showCalendarNotFoundToast, showErrorToast } from "./helpers/errors";
import { buildTodoList, isTaskBlockItem, isTodoItem, todoState } from "./helpers/todoList";
import useCalendars from "./hooks/useCalendars";
import useEvents from "./hooks/useEvents";
import useTimeEntries from "./hooks/useTimeEntries";
import useTodoGroups from "./hooks/useTodoGroups";
import useTodos from "./hooks/useTodos";
import useTodoTags from "./hooks/useTodoTags";
import { Block, TimeEntry } from "./types";

interface Preferences {
  timeTrackingApp: string;
  timeEntryCalendar: string | undefined; // optional
  blockCalendar: string;
}

const { timeTrackingApp, timeEntryCalendar, blockCalendar } = getPreferenceValues<Preferences>();

const calendars =
  timeTrackingApp === "calendar" && timeEntryCalendar ? [timeEntryCalendar, blockCalendar] : [blockCalendar];

const twelveHoursAgo = new Date(Date.now() - 43_200_000);

function APIKeyErrorView({ missingKey }: { missingKey: string }): JSX.Element {
  return (
    <List>
      <List.EmptyView
        icon="⚙️"
        title="Welcome to Track Time for To-Dos! One thing before we start..."
        description={`"${missingKey}" is missing or invalid. Please update it in extension preferences and try again.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={() => void openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function TrackTime({ stoppableRunningTimeEntry }: { stoppableRunningTimeEntry?: TimeEntry }) {
  const [list, setList] = useState(initialList);

  const { todos, todosError, isLoadingTodos, revalidateTodos, permissionView } = useTodos({ list });
  const { todoGroups, tieredTodoGroups, isLoadingTodoGroups } = useTodoGroups();
  const { todoTags, isLoadingTodoTags } = useTodoTags();
  const [isLoadingBlocks, blocks, revalidateBlocks] = useEvents<Block>({
    calendars: [blockCalendar],
    interval: list.isToday ? today : todayAndNextSevenDays,
    blocksOnly: true,
  });

  const { timeEntries, isLoadingTimeEntries, timeEntriesError, revalidateTimeEntries, mutateTimeEntries } =
    useTimeEntries(timeTrackingApp, {
      // A minimum of 12 hours' worth of time entries to prevent running timers from disappearing at midnight.
      // If too early, durations may be inflated for carryover to-dos. Logbook will not show prior days' time entries.
      from: startOfToday < twelveHoursAgo ? startOfToday : twelveHoursAgo,
      calendarName: timeEntryCalendar,
    });

  const sectionedTodoItems = useMemo(
    () =>
      buildTodoList(todos, todoGroups, todoTags, blocks, null, timeEntries, [
        todoState.inProgress,
        todoState.paused,
        todoState.timeblocked,
        todoState.notTimeblocked,
        todoState.completed,
        todoState.canceled,
      ]),
    [todos, todoGroups, todoTags, blocks, timeEntries]
  );

  // Assume zero or one running time entry. Toggl & Clockify don't allow multiple running time entries. If
  // `calendarTimeTracker` is used, multiple running time entries can be created off-extension.
  const runningTimeEntry = useMemo(() => findRunningTimeEntry(timeEntries), [timeEntries]);
  const runningTimeEntryListItem = useMemo(
    () => sectionedTodoItems?.find(([section]) => section === todoState.inProgress)?.[1].at(0),
    [sectionedTodoItems]
  );

  useEffect(() => {
    if (stoppableRunningTimeEntry) {
      confirmAlert({
        icon: Icon.Stop,
        title: "Stop Running Timer",
        message: `Do you want to stop the timer "${stoppableRunningTimeEntry.title}"?`,
      })
        .then((isConfirmed) => {
          if (isConfirmed) {
            return stopTimer({ timeEntry: stoppableRunningTimeEntry, revalidateTimeEntries, mutateTimeEntries });
          }
        })
        .catch((error) => console.error(error));
    }
  }, [mutateTimeEntries, revalidateTimeEntries, stoppableRunningTimeEntry]);

  if (permissionView) {
    return <ScopedPermissionView scope="Reminders" />;
  }

  if (todosError) {
    void showErrorToast("Unable to fetch to-dos", todosError);
  }

  if (timeEntriesError) {
    void showErrorToast("Unable to fetch time entries", timeEntriesError);
  }

  return (
    <TodoList
      sectionedListItems={sectionedTodoItems}
      listName={list.title}
      showSourceIcon={!list.sourceId}
      isTodayList={list.isToday ?? false}
      isLoading={isLoadingTodos || isLoadingTodoGroups || isLoadingTodoTags || isLoadingBlocks || isLoadingTimeEntries}
      tieredTodoGroups={tieredTodoGroups}
      todoTags={todoTags}
      floatingRunningTimeEntry={runningTimeEntryListItem ? undefined : runningTimeEntry}
      showNoRunningTimeEntrySection={!runningTimeEntryListItem}
      revalidateTodos={revalidateTodos}
      revalidateBlocks={revalidateBlocks}
      revalidateTimeEntries={revalidateTimeEntries}
      mutateTimeEntries={mutateTimeEntries}
      searchBarAccessory={<TodoListDropdown list={list} setList={setList} />}
      getPrimaryActions={(item) => (
        <>
          <TrackTimeActions
            item={item}
            isTimerRunning={!!runningTimeEntry}
            runningTimeEntryTodoItem={
              runningTimeEntryListItem && isTodoItem(runningTimeEntryListItem) ? runningTimeEntryListItem : undefined
            }
            revalidateTodos={revalidateTodos}
            revalidateTimeEntries={revalidateTimeEntries}
            mutateTimeEntries={mutateTimeEntries}
          />

          {isTaskBlockItem(item) ? (
            <TaskBlockActions
              rootTaskBlockItem={item}
              showSourceIcon={!list.sourceId}
              isTodayList={list.isToday ?? false}
              tieredTodoGroups={tieredTodoGroups}
              isTimerRunning={!!runningTimeEntry}
              todoTags={todoTags}
              revalidateRootTodos={revalidateTodos}
              revalidateRootBlocks={revalidateBlocks}
              revalidateTimeEntries={revalidateTimeEntries}
            />
          ) : null}
        </>
      )}
    />
  );
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: { action: string } }>) {
  // Ensure the time tracking app and API key are configured.
  // The default welcome/setup screen won't appear since they aren't required preferences for this command.
  // They need to be extension preferences so their values--and time tracking data--are accessible from other commands.

  // If necessary, show permission view or calendar name error message.
  const { missingCalendarNames, permissionView } = useCalendars(calendars);
  if (!permissionView && missingCalendarNames && missingCalendarNames.length > 0) {
    void (async () => await showCalendarNotFoundToast(missingCalendarNames))();
  }

  // When launched from a deeplink, fetch the running time entry, if any, here and pass it to `TrackTime()` so that the
  // `confirmAlert` is presented only once. If `runningTimeEntry` in `TrackTime()` is used, `confirmAlert` may be shown
  // multiple times, e.g., after `revaliateTimeEntries()` is called.
  const isShowingAlert = !permissionView && launchContext?.action === "stop";
  const { isLoadingTimeEntries, timeEntries } = useTimeEntries(timeTrackingApp, {
    runningTimerOnly: true,
    execute: isShowingAlert,
  });
  const runningTimeEntry = isShowingAlert && !isLoadingTimeEntries ? findRunningTimeEntry(timeEntries) : undefined;

  return timeTrackerErrorPref ? (
    <APIKeyErrorView missingKey={timeTrackerErrorPref} />
  ) : permissionView ? (
    <ScopedPermissionView scope="Calendars" />
  ) : (
    <TrackTime stoppableRunningTimeEntry={runningTimeEntry} />
  );
}
