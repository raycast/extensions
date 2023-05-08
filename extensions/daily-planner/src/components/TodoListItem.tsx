import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { differenceInCalendarDays } from "date-fns";
import { useMemo } from "react";
import { enabledAction, todoSourceApplicationName } from "../api/todo-source";
import { findRunningTimeEntry } from "../helpers/actions";
import { formatDuration, formatInterval, now } from "../helpers/datetime";
import { formatTaskBlockTodoCount, isTaskBlockItem, isTodoItem, TaskBlockItem, TodoItem } from "../helpers/todoList";
import { getPercentTrackedIcon, getTodoListItemIcon, todoSourceIcon } from "../helpers/todoListIcons";
import useElapsedTime from "../hooks/useElapsedTime";
import { Block, CalendarEvent, TimeEntry, TodoGroup, TodoSourceId } from "../types";
import TodoActions from "./TodoActions";
import TodoDetail, { capitalize } from "./TodoDetail";

const gray = { light: "#767473", dark: "#9E9B9A" };

function getTrackedTimeAccessory(
  items: NonNullable<TodoItem["tracked"]>["items"],
  totalDuration: NonNullable<NonNullable<TodoItem["tracked"]>["totalDuration"]>,
  runningTimeEntryDuration: number | undefined,
  blockedDuration: number | null | undefined
): List.Item.Accessory {
  const count = items.length;
  const duration = runningTimeEntryDuration ? totalDuration + runningTimeEntryDuration : totalDuration;
  const percentTracked = blockedDuration ? Math.round((duration / blockedDuration) * 100) : null;
  const entryList = items.map(({ start, end }) => formatInterval({ start, end: end ?? new Date() })).join("\n");

  return {
    icon: percentTracked !== null ? getPercentTrackedIcon(percentTracked) : undefined,
    text: {
      color: Color.PrimaryText, // custom colors aren't allowed
      value: formatDuration(duration, { style: "time", showSeconds: true }),
    },
    tooltip: `${count === 1 ? "T" : `${count} t`}ime ${count === 1 ? "entry" : "entries"} recorded today${
      percentTracked ? ` (${percentTracked.toString()}% of blocked time)` : ""
    }:\n${entryList}`,
  };
}

export default function TodoListItem({
  isTodayList,
  item,
  tieredTodoGroups,
  todoTags,
  revalidateTodos,
  revalidateBlocks,
  revalidateUpcomingEvents,
  revalidateTimeEntries,
  mutateTimeEntries,
  getPrimaryActions,
  getCreateTodoAction,
  showSourceIcon,
  parentBlock,
}: {
  isTodayList: boolean;
  item: TodoItem | TaskBlockItem;
  tieredTodoGroups: TodoGroup[] | undefined;
  todoTags: Map<string, string> | undefined;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateBlocks: () => Promise<Block[]>;
  revalidateUpcomingEvents: (() => Promise<CalendarEvent[]>) | undefined;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
  getPrimaryActions: (item: TodoItem | TaskBlockItem, parentBlock?: Block) => JSX.Element;
  getCreateTodoAction: () => JSX.Element;
  showSourceIcon?: boolean;
  parentBlock?: Block;
}): JSX.Element {
  const itemRunningTimeEntry = useMemo(() => findRunningTimeEntry(item.tracked?.items), [item.tracked]);
  const runningTimeEntryDuration = useElapsedTime(itemRunningTimeEntry?.start);

  const isTodo = isTodoItem(item);

  const keywords = useMemo(() => {
    const keywords: string[] = [];
    if (isTodo) {
      const { todoId, group, tags } = item;
      keywords.push(todoId);
      if (group) keywords.push(...group.title.split(" "));
      if (tags) keywords.push(...tags.map(({ name }) => name));
    } else if (isTaskBlockItem(item)) {
      for (const blockAndItems of item.taskBlockedTodoItems) {
        for (const { todoId, title, group, tags } of blockAndItems[1]) {
          keywords.push(todoId);
          keywords.push(...title.split(" "));
          if (group) keywords.push(...group.title.split(" "));
          if (tags) keywords.push(...tags.map(({ name }) => name));
        }
      }
    }
    return keywords;
  }, [isTodo, item]);

  let accessories = useMemo(() => {
    const accessories: List.Item.Accessory[] = [];

    if (isTodo) {
      const { tags, startDate, dueDate } = item;

      if (tags) {
        accessories.push({
          icon: Icon.Tag,
          text: tags.length.toString(),
          tooltip: `Tag${tags.length === 1 ? "" : "s"}: ${tags.map(({ name }) => name).join(", ")}`,
        });
      }

      if (startDate && !isTodayList) {
        const days = differenceInCalendarDays(startDate, now);
        accessories.push({
          icon: {
            source: { light: "light/calendar-alt.svg", dark: "dark/calendar-alt.svg" },
            tintColor: gray /*Color.SecondaryText*/,
          },
          text: days === 0 ? "Today" : `${days}d`,
          tooltip: `Start date: ${startDate.toLocaleDateString()}`,
        });
      }

      if (dueDate) {
        const days = differenceInCalendarDays(dueDate, now);
        if (!isTodayList || days !== 0 || enabledAction[item.sourceId].setStartDate) {
          const color = days < 0 ? Color.Red : days === 0 ? Color.Orange : undefined;
          accessories.push({
            icon: {
              source: Icon.Flag,
              tintColor: color,
            },
            text: {
              color: color,
              value: days === 0 ? "Today" : `${days}d`,
            },
            tooltip: `Due date: ${dueDate.toLocaleDateString()}`,
          });
        }
      }
    }

    if (item.blocked) {
      const count = item.blocked.items.length;
      const eventList = item.blocked.items.map((e) => formatInterval(e)).join("\n");
      accessories.push({
        icon: Icon.Calendar,
        text: `${formatInterval(item.blocked.currentOrNextItem)}${count > 1 ? ` +${count - 1}` : ""}`,
        tooltip: `${count === 1 ? "S" : `${count} s`}cheduled time block${count === 1 ? "" : "s"}:\n${eventList}`,
      });
    }

    if (item.conflicts?.length) {
      const count = item.conflicts.length;
      accessories.push({
        icon: { source: Icon.ArrowsContract, tintColor: Color.Red },
        tooltip: `${count === 1 ? "S" : `${count} s`}cheduling conflict${count === 1 ? "" : "s"}:\n${item.conflicts
          .map((e) => `${e.title} (${formatInterval(e)})`)
          .join("\n")}`,
      });
    }

    return accessories;
  }, [isTodayList, isTodo, item]);

  if (item.tracked) {
    // Tracked time accessory is outside `useMemo` since it may have to be updated every second if the timer is running.
    const { items, totalDuration } = item.tracked;
    accessories = accessories.concat(
      getTrackedTimeAccessory(items, totalDuration, runningTimeEntryDuration, item.blocked?.totalDuration)
    );
  }

  if (showSourceIcon) {
    accessories = accessories.concat({
      icon: { source: isTodo ? todoSourceIcon[item.sourceId] : Icon.RaycastLogoPos },
      tooltip: isTodo ? `Source: ${todoSourceApplicationName[item.sourceId]}` : undefined,
    });
  }

  return (
    <List.Item
      key={item.id}
      icon={{
        value: getTodoListItemIcon(item),
        tooltip: `Status: ${item.state}${isTodo && item.priority ? ` ∙ Priority: ${item.priority.name}` : ""}`,
      }}
      title={item.title}
      subtitle={
        isTodo
          ? item.group
            ? {
                value: item.group.title,
                tooltip: `${capitalize(item.group.type)}: ${item.group.title}`,
              }
            : undefined
          : isTaskBlockItem(item)
          ? formatTaskBlockTodoCount(item.taskBlockedTodoItems)
          : undefined
      }
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel title={item.title}>
          {getPrimaryActions(item, parentBlock)}

          {isTodo ? (
            <TodoActions
              isTodayList={isTodayList}
              getCreateTodoAction={getCreateTodoAction}
              todoItem={item}
              tieredTodoGroups={tieredTodoGroups}
              todoTags={todoTags}
              revalidateTodos={revalidateTodos}
              revalidateBlocks={revalidateBlocks}
              revalidateUpcomingEvents={revalidateUpcomingEvents}
              revalidateTimeEntries={revalidateTimeEntries}
              mutateTimeEntries={mutateTimeEntries}
              getDetail={() => (
                <TodoDetail
                  isTodayList={isTodayList}
                  listTodoItem={item}
                  tieredTodoGroups={tieredTodoGroups}
                  todoTags={todoTags}
                  revalidateListTodos={revalidateTodos}
                  revalidateListUpcomingEvents={revalidateUpcomingEvents}
                  revalidateListTimeEntries={revalidateTimeEntries}
                  mutateListTimeEntries={mutateTimeEntries}
                  getCreateTodoAction={getCreateTodoAction}
                />
              )}
            />
          ) : (
            <ActionPanel.Section>{getCreateTodoAction()}</ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
