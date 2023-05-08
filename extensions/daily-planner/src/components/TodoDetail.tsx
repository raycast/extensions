import { ActionPanel, Color, Detail, getPreferenceValues, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { isFuture, isToday } from "date-fns";
import { useMemo } from "react";
import { isTaskBlock } from "../api/todo-source";
import { calendars, defaultDuration, offHours } from "../block-time";
import {
  formatDuration,
  formatRelativeDateOnly,
  formatRelativeDateTime,
  formatRelativeTimeInterval,
  restOfTodayAndNextSevenDays,
} from "../helpers/datetime";
import { showErrorToast } from "../helpers/errors";
import { getAvailableTimes } from "../helpers/interval";
import { sumDuration, TodoReportItem } from "../helpers/report";
import { buildTodoItem, TodoItem } from "../helpers/todoList";
import { taskBlockIcon, todoGroupIcon } from "../helpers/todoListIcons";
import useDetailedTodo from "../hooks/useDetailedTodo";
import useEvents from "../hooks/useEvents";
import useTimeEntries from "../hooks/useTimeEntries";
import { Block, CalendarEvent, DetailedTodo, TimeEntry, Todo, TodoGroup, TodoSourceId } from "../types";
import BlockTimeActions from "./BlockTimeActions";
import TodoActions from "./TodoActions";
import TrackTimeActions from "./TrackTimeActions";

interface Preferences {
  blockCalendar: string;
  timeTrackingApp: string;
  timeEntryCalendar: string | undefined; // optional
}

const { blockCalendar, timeTrackingApp, timeEntryCalendar } = getPreferenceValues<Preferences>();

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isDetailedTodo(todo: Todo | DetailedTodo): todo is DetailedTodo {
  return (todo as DetailedTodo).notes !== undefined;
}

function isNotReportItem(item: TodoItem | TodoReportItem): item is TodoItem {
  return (item as TodoItem).state !== undefined;
}

export default function TodoDetail({
  listTodoItem,
  isTodayList,
  tieredTodoGroups,
  todoTags,
  revalidateListTodos,
  revalidateListBlocks,
  revalidateListUpcomingEvents,
  revalidateListTimeEntries,
  mutateListTimeEntries,
  getCreateTodoAction,
}: {
  listTodoItem: TodoItem | TodoReportItem;
  isTodayList?: boolean;
  tieredTodoGroups?: TodoGroup[] | undefined;
  todoTags?: Map<string, string>;
  revalidateListTodos?: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateListBlocks?: () => Promise<Block[]>;
  revalidateListUpcomingEvents?: () => Promise<CalendarEvent[]>;
  revalidateListTimeEntries?: (() => Promise<TimeEntry[]>) | (() => void);
  mutateListTimeEntries?: MutatePromise<TimeEntry[]>;
  getCreateTodoAction?: () => JSX.Element;
}): JSX.Element {
  const { todo, isLoadingTodo, revalidateTodo } = useDetailedTodo(listTodoItem);

  const [isLoadingBlocks, blocks, revalidateBlocks] = useEvents<Block>({
    calendars: [blockCalendar],
    url: listTodoItem.url,
    urlIncludes: listTodoItem.id, // fetches Task Blocks
  });

  // `offHours === undefined` outside the Block Time command.
  const [isLoadingUpcomingEvents, upcomingEvents, revalidateUpcomingEvents] = useEvents({
    calendars,
    interval: restOfTodayAndNextSevenDays,
    execute: offHours !== undefined,
  });

  const { timeEntries, timeEntriesError, isLoadingTimeEntries, revalidateTimeEntries, mutateTimeEntries } =
    useTimeEntries(timeTrackingApp, {
      calendarName: timeEntryCalendar,
      url: listTodoItem.url,
      description: listTodoItem.title,
    });
  if (timeEntriesError) {
    void showErrorToast("Unable to fetch time entries", timeEntriesError);
  }

  const todoItem = buildTodoItem(todo, tieredTodoGroups, todoTags, blocks, upcomingEvents, timeEntries);

  const markdown = useMemo(() => {
    const markdownElements: string[] = [];
    if (todo?.title) markdownElements.push(`# ${todo.title}`);
    if (todo && isDetailedTodo(todo)) {
      if (todo.notes) markdownElements.push(todo.notes.replaceAll("\n", "  \n"));
      if (todo.concatenatedChecklistItems) markdownElements.push(todo.concatenatedChecklistItems);
    }
    return markdownElements.join("\n\n");
  }, [todo]);

  const revalidateAllTodos = async (sourceId?: TodoSourceId) => {
    await Promise.all([revalidateTodo(), revalidateListTodos ? revalidateListTodos(sourceId) : Promise.resolve()]);
  };

  const revalidateAllBlocks = async () => {
    const [blocks] = await Promise.all([revalidateBlocks(), revalidateListBlocks ? revalidateListBlocks() : []]);
    return blocks;
  };

  const revalidateAllUpcomingEvents = async () => {
    const [events] = await Promise.all([
      revalidateUpcomingEvents(),
      revalidateListUpcomingEvents ? revalidateListUpcomingEvents() : [],
    ]);
    return events;
  };

  const revalidateAllTimeEntries = () =>
    Promise.all([
      revalidateTimeEntries ? revalidateTimeEntries() : [],
      revalidateListTimeEntries ? revalidateListTimeEntries() : [],
    ]);

  return (
    <Detail
      isLoading={isLoadingTodo || isLoadingBlocks || isLoadingUpcomingEvents || isLoadingTimeEntries}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {blocks && blocks.length > 0 ? (
            <Detail.Metadata.TagList title={`Blocks (${formatDuration(blocks.reduce(sumDuration, 0))})`}>
              {Array.from(blocks).map(({ id, start, end, url }) => {
                const color = isToday(start) ? Color.Green : isFuture(start) ? Color.Blue : Color.SecondaryText;
                return (
                  <Detail.Metadata.TagList.Item
                    key={id}
                    icon={isTaskBlock({ url }) ? { source: taskBlockIcon, tintColor: color } : undefined}
                    text={formatRelativeTimeInterval({ start, end })}
                    color={color}
                  />
                );
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {timeEntries && timeEntries.length > 0 ? (
            <Detail.Metadata.TagList title={`Time Entries (${formatDuration(timeEntries.reduce(sumDuration, 0))})`}>
              {Array.from(timeEntries).map(({ id, start, end, url }) => {
                const color = isToday(start) ? Color.Green : isFuture(start) ? Color.Blue : Color.SecondaryText;
                return (
                  <Detail.Metadata.TagList.Item
                    key={id}
                    icon={isTaskBlock({ url }) ? { source: taskBlockIcon, tintColor: color } : undefined}
                    text={
                      end ? formatRelativeTimeInterval({ start, end }) : formatRelativeDateTime(start) + " - Running"
                    }
                    color={color}
                  />
                );
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {(blocks?.length ?? 0) + (timeEntries?.length ?? 0) > 0 ? <Detail.Metadata.Separator /> : null}

          {todo?.startDate ? (
            <Detail.Metadata.Label
              title="Start Date"
              icon={Icon.Calendar}
              text={formatRelativeDateOnly(todo.startDate)}
            />
          ) : null}

          {todo?.dueDate ? (
            <Detail.Metadata.Label title="Due Date" icon={Icon.Flag} text={formatRelativeDateOnly(todo.dueDate)} />
          ) : null}

          {todo?.completionDate ? (
            <Detail.Metadata.Label
              title="Completion Date"
              icon={Icon.CheckRosette}
              text={formatRelativeDateTime(todo.completionDate)}
            />
          ) : null}

          {todoItem?.priority ? (
            <Detail.Metadata.Label
              title="Priority"
              icon={{ source: todoItem.priority.icon, tintColor: todoItem.priority.color }}
              text={todoItem.priority.name}
            />
          ) : null}

          {todoItem?.group ? (
            <Detail.Metadata.Label
              title={capitalize(todoItem.group.type)}
              icon={todoGroupIcon[todoItem.group.type]}
              text={todoItem.group.title}
            />
          ) : null}

          {todoItem?.tags ? (
            <Detail.Metadata.TagList title="Tags">
              {todoItem.tags.map(({ id, name }) => (
                <Detail.Metadata.TagList.Item key={id} text={name} color={Color.Green} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        todoItem && isNotReportItem(todoItem) && revalidateListTodos && getCreateTodoAction ? (
          <ActionPanel>
            {offHours ? (
              <BlockTimeActions
                item={todoItem}
                taskBlocks={blocks?.filter(isTaskBlock)}
                isLoadingUpcomingEvents={isLoadingUpcomingEvents}
                upcomingEvents={upcomingEvents}
                availableTimes={getAvailableTimes(upcomingEvents, offHours)}
                defaultDuration={defaultDuration}
                revalidateTodos={revalidateAllTodos}
                revalidateBlocks={revalidateAllBlocks}
                revalidateUpcomingEvents={revalidateAllUpcomingEvents}
              />
            ) : null}

            {revalidateListTimeEntries ? (
              <TrackTimeActions
                item={todoItem}
                isTimerRunning={timeEntries?.some(({ end }) => !end) ?? false}
                revalidateTodos={revalidateAllTodos}
                revalidateTimeEntries={revalidateTimeEntries}
                mutateTimeEntries={mutateTimeEntries}
              />
            ) : null}

            <TodoActions
              isTodayList={isTodayList ?? false}
              getCreateTodoAction={getCreateTodoAction}
              todoItem={todoItem}
              tieredTodoGroups={tieredTodoGroups}
              todoTags={todoTags}
              revalidateTodos={revalidateAllTodos}
              revalidateBlocks={revalidateAllBlocks}
              revalidateUpcomingEvents={revalidateAllUpcomingEvents}
              revalidateTimeEntries={revalidateAllTimeEntries}
              mutateTimeEntries={mutateListTimeEntries}
              mutateDetailTimeEntries={mutateTimeEntries}
            />
          </ActionPanel>
        ) : null
      }
    />
  );
}
