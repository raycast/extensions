import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { useMemo, useState } from "react";
import { isTaskBlock } from "./api/todo-source";
import BlockTimeActions from "./components/BlockTimeActions";
import ScopedPermissionView from "./components/ScopedPermissionView";
import TaskBlockActions from "./components/TaskBlockActions";
import TaskBlockTodoList from "./components/TaskBlockTodoList";
import TodoList from "./components/TodoList";
import TodoListDropdown, { initialList } from "./components/TodoListDropdown";
import { restOfTodayAndNextSevenDays, today, todayAndNextSevenDays } from "./helpers/datetime";
import { showCalendarNotFoundToast, showErrorToast } from "./helpers/errors";
import { getAvailableTimes, getOffHours } from "./helpers/interval";
import { buildTodoList, isTaskBlockItem, todoState } from "./helpers/todoList";
import useCalendars from "./hooks/useCalendars";
import useEvents from "./hooks/useEvents";
import useTodoGroups from "./hooks/useTodoGroups";
import useTodos from "./hooks/useTodos";
import useTodoTags from "./hooks/useTodoTags";
import { Block } from "./types";

interface Preferences {
  blockCalendar: string;
  eventCalendars: string;
  defaultBlockDuration: string;
  workingHoursStart: string;
  workingHoursEnd: string;
}

const { blockCalendar, eventCalendars, defaultBlockDuration, workingHoursStart, workingHoursEnd } =
  getPreferenceValues<Preferences>();

export const calendars = eventCalendars ? [blockCalendar, ...eventCalendars.split(",")] : [blockCalendar];
export const defaultDuration = parseInt(defaultBlockDuration);
export const [offHours, prefError] = getOffHours(workingHoursStart, workingHoursEnd, restOfTodayAndNextSevenDays);

function BlockTime({ isLoadingCalendars }: { isLoadingCalendars: boolean }) {
  const [list, setList] = useState(initialList);

  const { todos, todosError, isLoadingTodos, revalidateTodos, permissionView } = useTodos({ list });
  const { todoGroups, tieredTodoGroups, isLoadingTodoGroups } = useTodoGroups();
  const { todoTags, isLoadingTodoTags } = useTodoTags();
  const [isLoadingBlocks, blocks, revalidateBlocks] = useEvents<Block>({
    calendars: [blockCalendar],
    interval: list.isToday ? today : todayAndNextSevenDays,
    blocksOnly: true,
  });
  const taskBlocks = useMemo(() => blocks?.filter(isTaskBlock), [blocks]);

  const [isLoadingUpcomingEvents, upcomingEvents, revalidateUpcomingEvents] = useEvents({
    calendars,
    interval: restOfTodayAndNextSevenDays,
  });

  const sectionedTodoItems = useMemo(
    () =>
      buildTodoList(todos, todoGroups, todoTags, blocks, upcomingEvents, null, [
        todoState.notTimeblocked,
        todoState.timeblocked,
        todoState.completed,
        todoState.canceled,
      ]),
    [todos, todoGroups, todoTags, blocks, upcomingEvents]
  );

  const availableTimes = useMemo(() => getAvailableTimes(upcomingEvents, offHours), [upcomingEvents]);

  if (permissionView) {
    return <ScopedPermissionView scope="Reminders" />;
  }

  if (prefError) {
    void showErrorToast("Invalid Working Hours", prefError);
  }

  if (todosError) {
    void showErrorToast("Unable to fetch to-dos", todosError);
  }

  return (
    <TodoList
      sectionedListItems={sectionedTodoItems}
      listName={list.title}
      showSourceIcon={!list.sourceId}
      isTodayList={list.isToday ?? false}
      isLoading={isLoadingCalendars || isLoadingTodos || isLoadingTodoGroups || isLoadingTodoTags || isLoadingBlocks}
      tieredTodoGroups={tieredTodoGroups}
      todoTags={todoTags}
      revalidateTodos={revalidateTodos}
      revalidateBlocks={revalidateBlocks}
      revalidateUpcomingEvents={revalidateUpcomingEvents}
      searchBarAccessory={<TodoListDropdown list={list} setList={setList} />}
      getPrimaryActions={(item) => (
        <>
          {isTaskBlockItem(item) ? (
            <TaskBlockActions
              rootTaskBlockItem={item}
              showSourceIcon={!list.sourceId}
              isTodayList={list.isToday ?? false}
              tieredTodoGroups={tieredTodoGroups}
              todoTags={todoTags}
              revalidateRootTodos={revalidateTodos}
              revalidateRootBlocks={revalidateBlocks}
            />
          ) : null}

          <BlockTimeActions
            item={item}
            taskBlocks={taskBlocks}
            isLoadingUpcomingEvents={isLoadingUpcomingEvents}
            upcomingEvents={upcomingEvents}
            availableTimes={availableTimes}
            defaultDuration={defaultDuration}
            revalidateTodos={revalidateTodos}
            revalidateBlocks={revalidateBlocks}
            revalidateUpcomingEvents={revalidateUpcomingEvents}
          />
        </>
      )}
    />
  );
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: { ids: string[] } }>) {
  // If necessary, show permission view or calendar name error message. A post-comma space in `eventCalendars` may be
  // the leading cause of errors, but cannot be trimmed since leading/trailing spaces are allowed in calendar names.
  const { isLoadingCalendars, missingCalendarNames, permissionView } = useCalendars(calendars);
  if (!permissionView && missingCalendarNames && missingCalendarNames.length > 0) {
    void (async () => await showCalendarNotFoundToast(missingCalendarNames))();
  }

  return permissionView ? (
    <ScopedPermissionView scope="Calendars" />
  ) : launchContext?.ids && launchContext.ids.length > 0 ? (
    <TaskBlockTodoList sourceIdedTodoIds={launchContext.ids} />
  ) : (
    <BlockTime isLoadingCalendars={isLoadingCalendars} />
  );
}
