import { getPreferenceValues, List } from "@raycast/api";
import { useMemo } from "react";
import { activeSourceIds, createTaskBlockURL, parseSourceIdedTodoId, SourceIdedTodoId } from "../api/todo-source";
import { findRunningTimeEntry } from "../helpers/actions";
import { buildTaskBlockTodoList, isTodoItem, TaskBlockItem } from "../helpers/todoList";
import useEvents from "../hooks/useEvents";
import useTimeEntries from "../hooks/useTimeEntries";
import useTodoGroups from "../hooks/useTodoGroups";
import useTodos from "../hooks/useTodos";
import useTodoTags from "../hooks/useTodoTags";
import { CalendarEvent, Block, Todo, TodoGroup, TodoSourceId, TimeEntry } from "../types";
import TaskBlockTodoActions from "./TaskBlockTodoActions";
import TodoList from "./TodoList";
import TrackTimeActions from "./TrackTimeActions";

export interface TaskBlockTodoListProps {
  rootTaskBlockItem: TaskBlockItem;
  showSourceIcon: boolean;
  isTodayList: boolean;
  isTimerRunning?: boolean;
  tieredTodoGroups: Map<TodoSourceId, TodoGroup[]> | undefined;
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined;
  revalidateRootTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateRootBlocks: () => Promise<Block[]>;
  revalidateTimeEntries?: (() => Promise<TimeEntry[]>) | (() => void);
}

const { blockCalendar, timeTrackingApp } = getPreferenceValues<{ blockCalendar: string; timeTrackingApp: string }>();

function TaskBlockTodoListWithTodoAndEventIds({
  todoIdsBySource,
  eventIds,
  showSourceIcon,
  isTodayList,
  isTimerRunning,
  taskBlockRunningTimeEntry,
  rootTaskBlockItem,
  isLoading,
  tieredTodoGroups,
  todoTags,
  revalidateRootTodos,
  revalidateRootBlocks,
  revalidateTimeEntries,
}: {
  todoIdsBySource: Map<TodoSourceId, Todo["todoId"][]>;
  eventIds: string[] | undefined;
  showSourceIcon: boolean;
  isTodayList: boolean;
  isTimerRunning?: boolean;
  taskBlockRunningTimeEntry?: TimeEntry;
  rootTaskBlockItem?: TaskBlockItem;
  isLoading?: boolean;
  tieredTodoGroups: Map<TodoSourceId, TodoGroup[]> | undefined;
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined;
  revalidateRootTodos?: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateRootBlocks?: () => Promise<Block[]>;
  revalidateTimeEntries?: (() => Promise<TimeEntry[]>) | (() => void);
}): JSX.Element {
  const { todos, isLoadingTodos, revalidateTodos } = useTodos({ ids: todoIdsBySource });
  const [isLoadingBlocks, blocks, revalidateBlocks] = useEvents<Block>({
    calendars: [blockCalendar],
    ids: eventIds,
  });

  const runningTimeEntry = taskBlockRunningTimeEntry ?? findRunningTimeEntry(rootTaskBlockItem?.tracked?.items);

  const localTaskBlockItem = todos?.length
    ? buildTaskBlockTodoList(todos, tieredTodoGroups, todoTags, blocks, runningTimeEntry)
    : null;
  const taskBlockItem = localTaskBlockItem ?? rootTaskBlockItem;

  const revalidateAllBlocks = async () => {
    const [blocks] = await Promise.all([revalidateBlocks(), revalidateRootBlocks ? revalidateRootBlocks() : []]);
    return blocks;
  };

  return (
    <TodoList
      listName={taskBlockItem?.title}
      sectionedListItems={taskBlockItem?.taskBlockedTodoItems}
      showSourceIcon={showSourceIcon}
      isTodayList={isTodayList}
      isLoading={isLoadingTodos || isLoadingBlocks || isLoading}
      tieredTodoGroups={tieredTodoGroups}
      todoTags={todoTags}
      revalidateTodos={(sourceId) =>
        Promise.all([
          revalidateTodos(sourceId),
          revalidateRootTodos ? revalidateRootTodos(sourceId) : Promise.resolve(),
        ]).then(() => undefined)
      }
      revalidateBlocks={revalidateAllBlocks}
      getPrimaryActions={(item, parentBlock) => (
        <>
          {isTodoItem(item) && parentBlock ? (
            <TaskBlockTodoActions
              todoItem={item}
              currentBlock={parentBlock}
              availableTaskBlocks={blocks?.filter((block) => block !== parentBlock)}
              revalidateBlocks={revalidateAllBlocks}
            />
          ) : null}

          {taskBlockItem && isTimerRunning !== undefined && revalidateTimeEntries ? (
            <TrackTimeActions
              item={taskBlockItem}
              isTimerRunning={isTimerRunning}
              revalidateTodos={revalidateTodos}
              revalidateTimeEntries={revalidateTimeEntries}
              mutateTimeEntries={undefined /* `revalidateTimeEntries` suffices since timer isn't shown in this view */}
            />
          ) : null}
        </>
      )}
      emptyView={
        <List.EmptyView
          title="No To-Dos Found"
          description={
            !todos || todos.length === 0
              ? `None of the ${todoIdsBySource.size} to-do${
                  todoIdsBySource.size === 1 ? "" : "s"
                } intended for this task block were found in the database. They may have been deleted since the task block's creation, or the to-do IDs in the task block URL could be corrupted.`
              : !blocks || blocks.length === 0
              ? `None of the ${eventIds?.length ?? 0} calendar event${
                  eventIds?.length === 1 ? "" : "s"
                } created for this task block were found in the database.`
              : `Task block could not be reconstructed. (${todos.length} to-do${todos.length === 1 ? "" : "s"}, ${
                  blocks.length
                } block${blocks.length === 1 ? "" : "s"})`
          }
        />
      }
    />
  );
}

function TaskBlockTodoListWithProps(props: TaskBlockTodoListProps): JSX.Element {
  const { todoIdsBySource, eventIds } = useMemo(() => {
    const todoIdsBySource = new Map<TodoSourceId, Todo["todoId"][]>();
    const eventIds: CalendarEvent["id"][] = [];
    for (const [block, todoItems] of props.rootTaskBlockItem.taskBlockedTodoItems) {
      if (typeof block === "object") {
        eventIds.push(block.id);
      }
      for (const { sourceId, todoId } of todoItems) {
        const existing = todoIdsBySource.get(sourceId);
        if (existing) {
          existing.push(todoId);
        } else {
          todoIdsBySource.set(sourceId, [todoId]);
        }
      }
    }
    return { todoIdsBySource, eventIds };
  }, [props.rootTaskBlockItem]);

  return <TaskBlockTodoListWithTodoAndEventIds todoIdsBySource={todoIdsBySource} eventIds={eventIds} {...props} />;
}

function TaskBlockTodoListWithIds({ sourceIdedTodoIds }: { sourceIdedTodoIds: string[] }): JSX.Element {
  const todoIdsBySource = useMemo(() => {
    const todoIdsBySource = new Map<TodoSourceId, Todo["todoId"][]>();
    for (const id of sourceIdedTodoIds) {
      const parsedIds = parseSourceIdedTodoId(id);
      if (parsedIds) {
        const existing = todoIdsBySource.get(parsedIds.sourceId);
        if (existing) {
          existing.push(parsedIds.todoId);
        } else {
          todoIdsBySource.set(parsedIds.sourceId, [parsedIds.todoId]);
        }
      }
    }
    return todoIdsBySource;
  }, [sourceIdedTodoIds]);

  const { tieredTodoGroups, isLoadingTodoGroups } = useTodoGroups();
  const { todoTags, isLoadingTodoTags } = useTodoTags();

  const reconstructedURL = createTaskBlockURL(sourceIdedTodoIds as SourceIdedTodoId[]);

  // Fetch the blocks (task blocks) using the URL, and pass the the block IDs to `TaskBlockTodoListWithTodoAndEventIds`
  const [isLoadingBlocks, blocks] = useEvents<Block>({
    calendars: [blockCalendar],
    url: reconstructedURL,
  });

  const { isLoadingTimeEntries, timeEntries, revalidateTimeEntries } = useTimeEntries(timeTrackingApp, {
    runningTimerOnly: true,
  });
  const taskBlockRunningTimeEntry = timeEntries?.find(({ title, url }) =>
    url ? url === reconstructedURL : blocks?.some(({ title: blockTitle }) => title === blockTitle)
  );

  return (
    <TaskBlockTodoListWithTodoAndEventIds
      todoIdsBySource={todoIdsBySource}
      eventIds={blocks?.map(({ id }) => id)}
      isTimerRunning={(timeEntries?.length ?? 0) > 0}
      taskBlockRunningTimeEntry={taskBlockRunningTimeEntry}
      showSourceIcon={activeSourceIds.length > 1}
      isTodayList={false}
      isLoading={isLoadingTodoGroups || isLoadingTodoTags || isLoadingBlocks || isLoadingTimeEntries}
      tieredTodoGroups={tieredTodoGroups}
      todoTags={todoTags}
      revalidateTimeEntries={revalidateTimeEntries}
    />
  );
}

export default function TaskBlockTodoList(
  propsOrIds: TaskBlockTodoListProps | { sourceIdedTodoIds: string[] }
): JSX.Element {
  return "sourceIdedTodoIds" in propsOrIds ? (
    <TaskBlockTodoListWithIds {...propsOrIds} />
  ) : (
    <TaskBlockTodoListWithProps {...propsOrIds} />
  );
}
