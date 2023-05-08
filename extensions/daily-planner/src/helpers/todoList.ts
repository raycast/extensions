import {
  BREAK_BLOCK_DEEPLINK,
  extractSourceIdedTodoIdsInTaskBlockURL,
  getSourceIdedTodoId,
  isTaskBlock,
  priorityNameAndColor,
  SourceIdedTodoId,
} from "../api/todo-source";
import {
  Block,
  CalendarEvent,
  TimeEntry,
  Todo,
  TodoCore,
  TodoGroup,
  TodoGroupCore,
  TodoPriority,
  TodoSourceId,
  TodoStatus,
} from "../types";
import { formatDuration } from "./datetime";
import { groupToMap } from "./group";

interface TimeData<T> {
  readonly items: T[];
  readonly totalDuration: number;
  readonly currentOrNextItem: T;
}

export type TodoItemType = "todo" | "taskBlock";

export const todoState = {
  notTimeblocked: "Not Timeblocked",
  timeblocked: "Timeblocked", // has events
  inProgress: "In Progress", // has a running timer
  paused: "On Pause", // has timeEntries, but not completed
  completed: "Completed",
  canceled: "Canceled",
} as const;

export type TodoState = (typeof todoState)[keyof typeof todoState];

interface ListItem {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly state: TodoState;
  readonly blocked: TimeData<Block> | null;
  readonly tracked: TimeData<TimeEntry> | null;
  readonly conflicts?: CalendarEvent[];
}

// Todo hydrated with other data
export interface TodoItem extends ListItem, TodoCore {
  readonly id: SourceIdedTodoId;
  readonly priority?: TodoPriority;
  readonly group: TodoGroupCore | null;
  readonly tags: { id: string; name: string }[] | null;
}

export interface TaskBlockItem extends ListItem {
  readonly taskBlockedTodoItems: SectionedListItems<TodoItem>;
}

export type BreakBlockItem = ListItem;

interface TaskBlockedTodoItem extends TodoItem {
  readonly parentTaskBlock: Block;
}

export type SectionedListItems<T extends TodoItem | TaskBlockItem | BreakBlockItem> = [TodoState | Block, T[]][];

// Unlike the one in buildReport, this EXCLUDES running time entry duration.
const sumDuration = (total: number, { start, end }: Block | TimeEntry) =>
  end !== null ? total + (end - start) : total;

export function isTodoItem(item: TodoItem | TaskBlockItem | BreakBlockItem): item is TodoItem {
  return (item as TodoItem).todoId !== undefined;
}

export function isTaskBlockItem(item: TodoItem | TaskBlockItem | BreakBlockItem): item is TaskBlockItem {
  return (item as TaskBlockItem).taskBlockedTodoItems !== undefined;
}

function getTodoItemState(
  status: Todo["status"],
  hasBlocks: boolean,
  timeEntries: TimeEntry[] | null | undefined
): TodoState {
  switch (status) {
    case TodoStatus.open:
      if (timeEntries) {
        return timeEntries.some(({ end }) => !end) ? todoState.inProgress : todoState.paused;
      }
      if (hasBlocks) {
        return todoState.timeblocked;
      }
      return todoState.notTimeblocked;
    case TodoStatus.completed:
      return todoState.completed;
    case TodoStatus.canceled:
      return todoState.canceled;
    default:
      return todoState.notTimeblocked;
  }
}

function getTaskBlockItemState(todoItems: TodoItem[][], timeEntries: TimeEntry[] | undefined): TodoState {
  const firstTodoItemState = todoItems.at(0)?.at(0)?.state;
  if (firstTodoItemState === todoState.completed || firstTodoItemState === todoState.canceled) {
    const isUniformState = todoItems.every((todoItems) => todoItems.every(({ state }) => state === firstTodoItemState));
    if (isUniformState) {
      return firstTodoItemState;
    }
  }

  if (timeEntries) {
    return timeEntries.some(({ end }) => !end) ? todoState.inProgress : todoState.paused;
  }

  return todoState.timeblocked;
}

function getBreakBlockItemState(timeEntries: TimeEntry[] | undefined): TodoState {
  if (timeEntries) {
    return timeEntries.some(({ end }) => !end) ? todoState.inProgress : todoState.paused;
  }

  return todoState.timeblocked;
}

// Returns an event/time entry to be featured on the list. If there are many, picks one in the following order:
// the most-recently-started in-progress, the most imminent future, the last-started past.
// Assumes items.length > 0 (mainly to avoid annoying conditional statements in `TodoListItem`)
function getCurrentOrNextItem<T extends Block | TimeEntry>(items: T[], referenceTimeValue: number): T {
  const summarizeItem = (item: T) => {
    const startDistance = item.start - referenceTimeValue;
    const endDistance = item.end ? item.end - referenceTimeValue : 1;
    const signsMultiplied = Math.sign(startDistance) * Math.sign(endDistance);

    return {
      // -1 for in-progress, 0 for future (or unlikely, zero-length, happening-at-the-moment), and 1 for past events
      state: signsMultiplied > 0 && startDistance > 0 && endDistance > 0 ? 0 : signsMultiplied,
      // within a state, the more recently started or imminent, the better.
      absoluteStartDistance: Math.abs(startDistance),
    };
  };

  return items.reduce<{ item: T; state: number; absoluteStartDistance: number }>(
    (currentBest, item) => {
      const { state, absoluteStartDistance } = summarizeItem(item);
      if (
        state < currentBest.state ||
        (state === currentBest.state && absoluteStartDistance < currentBest.absoluteStartDistance)
      ) {
        return { item, state, absoluteStartDistance };
      }
      return currentBest;
    },
    { item: items[0], ...summarizeItem(items[0]) }
  ).item;
}

function toTodoItem(
  { sourceId, todoId, url, title, status, startDate, dueDate, completionDate, priority, group, tagIds, childIds }: Todo,
  todoGroupTitles: Map<TodoGroup["type"], Map<TodoGroup["id"], TodoGroup["title"]>> | undefined,
  todoTags: Map<string, string> | undefined,
  blocks: Block[] | undefined,
  conflicts: CalendarEvent[] | undefined,
  timeEntries: TimeEntry[] | null | undefined,
  referenceTimeValue: number
): TodoItem {
  const priorities = priorityNameAndColor[sourceId];

  return {
    id: getSourceIdedTodoId(sourceId, todoId),
    sourceId,
    todoId,
    url,
    title,
    state: getTodoItemState(status, !!blocks && blocks.length > 0, timeEntries),
    startDate,
    dueDate,
    completionDate,
    priority: priority && priorities ? { value: priority, ...priorities[priority] } : undefined,
    group: group
      ? {
          type: group.type,
          id: group.id,
          title: todoGroupTitles?.get(group.type)?.get(group.id) ?? group.id,
        }
      : null,
    tags: tagIds?.map((id) => ({ id, name: todoTags?.get(id) ?? id })) ?? null,
    childIds,
    blocked:
      blocks && blocks.length > 0
        ? {
            items: blocks,
            totalDuration: blocks.reduce(sumDuration, 0),
            currentOrNextItem: getCurrentOrNextItem(blocks, referenceTimeValue),
          }
        : null,
    conflicts,
    tracked:
      timeEntries && timeEntries.length > 0
        ? {
            items: timeEntries,
            totalDuration: timeEntries.reduce(sumDuration, 0),
            currentOrNextItem: getCurrentOrNextItem(timeEntries, referenceTimeValue),
          }
        : null,
  };
}

function findTaskBlocksAndTodoItemIds(groupedBlocks: Map<Block["url"], Block[]>): [Block, SourceIdedTodoId[]][] {
  const taskBlocksAndTodoItemIds: [Block, SourceIdedTodoId[]][] = [];
  for (const [url, blocks] of groupedBlocks) {
    if (url && isTaskBlock({ url })) {
      const todoItemIds = extractSourceIdedTodoIdsInTaskBlockURL(url);
      if (todoItemIds.length > 0) {
        taskBlocksAndTodoItemIds.push(...blocks.map<[Block, SourceIdedTodoId[]]>((block) => [block, todoItemIds]));
      }
    }
  }
  return taskBlocksAndTodoItemIds;
}

function findBreakBlocks(groupedBlocks: Map<Block["url"], Block[]>): Block[] | undefined {
  return groupedBlocks.get(BREAK_BLOCK_DEEPLINK);
}

// Removes the elements of `todoItems` associated with any of the given `taskBlocks`, groups them by the
// associated block, and returns them in a `Map`.
function transferAndGroupTaskBlockTodos(
  todoItems: (TodoItem | TaskBlockItem)[],
  taskBlocks: [Block, SourceIdedTodoId[]][]
): Map<Block["title"], Map<Block, TodoItem[]>> {
  const titleGroupedTaskBlocks = new Map<Block["title"], Map<Block, TodoItem[]>>();
  // Set removed `todoItem`s aside in case a `todoItem` was added to multiple task blocks.
  const taskBlockedTodoItems = new Map<TodoItem["id"], TaskBlockedTodoItem>();
  for (const [block, todoItemIds] of taskBlocks) {
    for (const todoItemId of todoItemIds) {
      // Search for `todoItem` first in the removed `todoItem` pool.
      let item = taskBlockedTodoItems.get(todoItemId);
      if (!item) {
        const i = todoItems.findIndex(({ id }) => id === todoItemId);
        if (i < 0) {
          continue;
        }
        // Remove this task-blocked `todoItem` from `todoItems`.
        const todoItem = todoItems.splice(i, 1)[0];
        if (isTaskBlockItem(todoItem)) {
          continue;
        }
        item = { ...todoItem, parentTaskBlock: block };
        taskBlockedTodoItems.set(todoItemId, item);
      }
      // Add `todoItem` to the task block.
      const blocksAndItems = titleGroupedTaskBlocks.get(block.title);
      if (blocksAndItems) {
        const items = blocksAndItems.get(block);
        if (items) {
          items.push(item);
        } else {
          blocksAndItems.set(block, [item]);
        }
      } else {
        titleGroupedTaskBlocks.set(block.title, new Map([[block, [item]]]));
      }
    }
  }
  return titleGroupedTaskBlocks;
}

function toTaskBlockItem(
  taskBlockedTodoItems: [Block, TodoItem[]][],
  // conflicts: CalendarEvent[] | undefined, // TODO: Implement
  timeEntries: TimeEntry[] | undefined,
  referenceTimeValue: number,
  title?: string
): TaskBlockItem {
  if (taskBlockedTodoItems.length === 0) {
    throw new Error("Failed to create a `TaskBlockItem`: Empty blocks array");
  }

  const blocks: Block[] = [];
  const groupedTodoItems: TodoItem[][] = [];
  for (const [block, todoItems] of taskBlockedTodoItems) {
    blocks.push(block);
    groupedTodoItems.push(todoItems);
  }

  const currentOrNextTaskBlock = getCurrentOrNextItem(blocks, referenceTimeValue);

  return {
    id: currentOrNextTaskBlock.id,
    url: currentOrNextTaskBlock.url,
    title: title ?? blocks.at(0)?.title ?? "Untitled",
    state: getTaskBlockItemState(groupedTodoItems, timeEntries),
    blocked: {
      items: blocks,
      totalDuration: blocks.reduce(sumDuration, 0),
      currentOrNextItem: currentOrNextTaskBlock,
    },
    tracked:
      timeEntries && timeEntries.length > 0
        ? {
            items: timeEntries,
            totalDuration: timeEntries.reduce(sumDuration, 0),
            currentOrNextItem: getCurrentOrNextItem(timeEntries, referenceTimeValue),
          }
        : null,
    taskBlockedTodoItems: taskBlockedTodoItems.sort(([aBlock], [bBlock]) => aBlock.start - bBlock.start),
  };
}

function addTaskBlockItems(
  items: (TodoItem | TaskBlockItem)[],
  taskBlocksAndTodoItemIds: [Block, SourceIdedTodoId[]][],
  groupedTimeEntries: Map<TimeEntry["title"], TimeEntry[]> | null,
  referenceTimeValue: number
): void {
  const groupedTaskBlocks = transferAndGroupTaskBlockTodos(items, taskBlocksAndTodoItemIds);
  if (groupedTaskBlocks.size === 0) {
    return;
  }

  for (const [title, blocksAndItems] of groupedTaskBlocks) {
    const timeEntries = groupedTimeEntries?.get(title);
    const taskBlockItem = toTaskBlockItem(Array.from(blocksAndItems), timeEntries, referenceTimeValue, title);

    items.push(taskBlockItem);
  }
}

function addBreakBlockItems(
  items: (TodoItem | TaskBlockItem | BreakBlockItem)[],
  breakBlocks: Block[],
  groupedTimeEntries: Map<TimeEntry["title"], TimeEntry[]> | null,
  referenceTimeValue: number
): void {
  const groupedBreakBlocks = groupToMap(breakBlocks, "title");

  for (const [title, blocks] of groupedBreakBlocks) {
    const unfinishedBlocks = blocks.filter(({ end }) => referenceTimeValue < end);
    if (unfinishedBlocks.length === 0) {
      continue;
    }

    const currentOrNextBreakBlock = getCurrentOrNextItem(unfinishedBlocks, referenceTimeValue);
    const timeEntries = groupedTimeEntries?.get(title);
    const breakBlockItem: BreakBlockItem = {
      id: currentOrNextBreakBlock.id,
      url: currentOrNextBreakBlock.url,
      title: currentOrNextBreakBlock.title,
      state: getBreakBlockItemState(timeEntries),
      blocked: {
        items: unfinishedBlocks,
        totalDuration: unfinishedBlocks.reduce(sumDuration, 0),
        currentOrNextItem: currentOrNextBreakBlock,
      },
      tracked:
        timeEntries && timeEntries.length > 0
          ? {
              items: timeEntries,
              totalDuration: timeEntries.reduce(sumDuration, 0),
              currentOrNextItem: getCurrentOrNextItem(timeEntries, referenceTimeValue),
            }
          : null,
    };

    items.push(breakBlockItem);
  }
}

function countTaskBlockTodos(taskBlockedTodoItems: TaskBlockItem["taskBlockedTodoItems"]): number {
  return taskBlockedTodoItems.reduce((sum, section) => sum + section[1].length, 0);
}

function formatTodoCount(todoCount: number): string {
  return todoCount === 1 ? "1 to-do" : `${todoCount} to-dos`;
}

export function formatTaskBlockTodoCount(taskBlockedTodoItems: TaskBlockItem["taskBlockedTodoItems"]): string {
  return formatTodoCount(countTaskBlockTodos(taskBlockedTodoItems));
}

export function formatStats(items: (TodoItem | TaskBlockItem)[]): string {
  let todoCount = 0;
  let blockedDuration: number | null = null;
  let trackedDuration: number | null = null;
  for (const item of items) {
    const { blocked, tracked } = item; //, taskBlockedTodoItems }
    todoCount += isTaskBlockItem(item) ? countTaskBlockTodos(item.taskBlockedTodoItems) : 1;
    if (blockedDuration !== null) {
      blockedDuration += blocked?.totalDuration ?? 0;
    } else if (blocked) {
      blockedDuration = blocked.totalDuration;
    }
    if (trackedDuration !== null) {
      trackedDuration += tracked?.totalDuration ?? 0;
    } else if (tracked?.currentOrNextItem.end) {
      // Prevent "0s tracked" from showing up in "In Progress" section (running timer section) subtitle.
      trackedDuration = tracked.totalDuration;
    }
  }
  const summaryComponents: string[] = [];
  summaryComponents.push(formatTodoCount(todoCount));
  if (blockedDuration !== null) {
    summaryComponents.push(formatDuration(blockedDuration) + " blocked");
  }
  if (trackedDuration !== null) {
    summaryComponents.push(formatDuration(trackedDuration) + " tracked");
  }
  return summaryComponents.join(" ∙ ");
}

function findSchedulingConflicts(
  groupedBlocks: Map<string, Block[]>,
  upcomingEvents: CalendarEvent[]
): Map<string, CalendarEvent[]> | null {
  if (upcomingEvents.length === 0 || groupedBlocks.size === 0) {
    return null;
  }
  const groupedConflicts = new Map<string, CalendarEvent[]>();
  for (const [url, blocks] of groupedBlocks) {
    for (const block of blocks) {
      for (const event of upcomingEvents) {
        if (event.end <= block.start || event.id === block.id) {
          continue;
        }
        if (block.end <= event.start) {
          break;
        }

        const existing = groupedConflicts.get(url);
        if (existing) {
          existing.push(event);
        } else {
          groupedConflicts.set(url, [event]);
        }
      }
    }
  }
  return groupedConflicts;
}

function getTodoGroupTitleLookupTableGroupedByType(todoGroups: TodoGroup[]) {
  return new Map<TodoGroup["type"], Map<TodoGroup["id"], TodoGroup["title"]>>(
    Array.from(groupToMap(todoGroups, "type"), ([type, todoGroups]) => [
      type,
      new Map(todoGroups.map(({ id, title }) => [id, title])),
    ])
  );
}

export function buildTodoList(
  todos: Todo[] | undefined,
  todoGroups: Map<TodoSourceId, TodoGroup[]> | undefined,
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined,
  blocks: Block[] | undefined,
  upcomingEvents: CalendarEvent[] | null | undefined,
  timeEntries: TimeEntry[] | null | undefined,
  orderedTodoStates: TodoState[]
): SectionedListItems<TodoItem | TaskBlockItem> | undefined {
  if (!todos || !todoGroups || !todoTags || !blocks || upcomingEvents === undefined) {
    return undefined;
  }

  const groupedBlocks = groupToMap(blocks, "url");
  const groupedConflicts = upcomingEvents ? findSchedulingConflicts(groupedBlocks, upcomingEvents) : null;
  const groupedTimeEntries = timeEntries ? groupToMap(timeEntries, "title") : null;

  const todoGroupTitles = new Map(
    Array.from(todoGroups, ([sourceId, todoGroups]) => [
      sourceId,
      getTodoGroupTitleLookupTableGroupedByType(todoGroups),
    ])
  );

  const referenceTimeValue = Date.now();

  // Create `TodoItem`s.
  const todoItems = todos.map((todo) =>
    toTodoItem(
      todo,
      todoGroupTitles.get(todo.sourceId),
      todoTags.get(todo.sourceId),
      groupedBlocks.get(todo.url),
      groupedConflicts?.get(todo.url),
      groupedTimeEntries?.get(todo.title),
      referenceTimeValue
    )
  );

  // Add task blocks
  const taskBlocks = findTaskBlocksAndTodoItemIds(groupedBlocks);
  if (taskBlocks.length > 0) {
    addTaskBlockItems(todoItems, taskBlocks, groupedTimeEntries, referenceTimeValue);
  }

  // Add break blocks
  const breakBlocks = findBreakBlocks(groupedBlocks);
  if (breakBlocks?.length) {
    addBreakBlockItems(todoItems, breakBlocks, groupedTimeEntries, referenceTimeValue);
  }

  const groupedTodoItems = groupToMap(todoItems, "state");

  // Sort "Timeblocked" items by current/next block start date
  const timeblockedTodoItems = groupedTodoItems.get(todoState.timeblocked);
  if (timeblockedTodoItems) {
    timeblockedTodoItems.sort(
      (a, b) =>
        (a.blocked?.currentOrNextItem.start ?? Number.MAX_SAFE_INTEGER) -
        (b.blocked?.currentOrNextItem.start ?? Number.MAX_SAFE_INTEGER)
    );
  }

  // Sort "Paused" items by most recent time entry start date
  const pausedTodoItems = groupedTodoItems.get(todoState.paused);
  if (pausedTodoItems) {
    pausedTodoItems.sort(
      (a, b) =>
        (a.tracked?.currentOrNextItem.start ?? Number.MAX_SAFE_INTEGER) -
        (b.tracked?.currentOrNextItem.start ?? Number.MAX_SAFE_INTEGER)
    );
  }

  // Sort state groups by the given order, and return the result.
  return Array.from(groupedTodoItems).sort(([aState], [bState]) => {
    const aIndex = orderedTodoStates.indexOf(aState);
    const bIndex = orderedTodoStates.indexOf(bState);
    return (aIndex !== -1 ? aIndex : Number.MAX_SAFE_INTEGER) - (bIndex !== -1 ? bIndex : Number.MAX_SAFE_INTEGER);
  });
}

function flattenTieredTodoGroups(tieredTodoGroups: TodoGroup[]): TodoGroup[] {
  return tieredTodoGroups.flatMap((group) => (group.subgroups ? group.subgroups.concat(group) : [group]));
}

export function buildTodoItem(
  todo: Todo | null | undefined,
  tieredTodoGroups: TodoGroup[] | undefined,
  todoTags: Map<string, string> | undefined,
  blocks: Block[] | undefined,
  upcomingEvents: CalendarEvent[] | undefined,
  todoTimeEntries: TimeEntry[] | null | undefined
): TodoItem | undefined {
  if (!todo || !tieredTodoGroups || !todoTags || !blocks || todoTimeEntries === undefined) {
    return undefined;
  }

  const todoGroupTitles = getTodoGroupTitleLookupTableGroupedByType(flattenTieredTodoGroups(tieredTodoGroups));

  const conflicts = upcomingEvents?.filter(({ url }) => url === todo.url);

  const referenceTimeValue = Date.now();

  return toTodoItem(todo, todoGroupTitles, todoTags, blocks, conflicts, todoTimeEntries, referenceTimeValue);
}

// Updates the second element (`TodoItem[]`) of each section with the given `todos` and `events`. This is for
// TaskBlockTodoList only and assumes that the `TodoItem`s in `original` can be updated or removed, but no new `TodoItem`s
// are added, since there is no way to add a Todo to a Task Block while in TaskBlockTodoList.
export function buildTaskBlockTodoList(
  todos: Todo[] | undefined,
  tieredTodoGroups: Map<TodoSourceId, TodoGroup[]> | undefined,
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined,
  blocks: Block[] | undefined,
  taskBlockRunningTimeEntry: TimeEntry | undefined
): TaskBlockItem | undefined {
  if (!todos || !tieredTodoGroups || !todoTags || !blocks?.length) {
    return undefined;
  }

  const todoGroupTitles = new Map(
    Array.from(tieredTodoGroups, ([sourceId, tieredTodoGroups]) => [
      sourceId,
      getTodoGroupTitleLookupTableGroupedByType(flattenTieredTodoGroups(tieredTodoGroups)),
    ])
  );

  const referenceTimeValue = Date.now();

  const todoItems = todos.map((todo) =>
    toTodoItem(
      todo,
      todoGroupTitles.get(todo.sourceId),
      todoTags.get(todo.sourceId),
      undefined,
      undefined,
      undefined,
      referenceTimeValue
    )
  );
  const taskBlocks = findTaskBlocksAndTodoItemIds(groupToMap(blocks, "url"));
  const groupedTaskBlocks = transferAndGroupTaskBlockTodos(todoItems, taskBlocks);

  const taskBlockedTodoItems = Array.from(groupedTaskBlocks).flatMap((group) =>
    Array.from(group[1]).sort(([aBlock], [bBlock]) => aBlock.start - bBlock.start)
  );

  const taskBlockItem = toTaskBlockItem(
    taskBlockedTodoItems,
    // `taskBlockRunningTimeEntry` is passed to `TrackTimeActions()` and determines whether `StartTimer()` or
    // `StopTimer()` is presented.
    taskBlockRunningTimeEntry ? [taskBlockRunningTimeEntry] : undefined,
    Date.now()
  );

  return taskBlockItem;
}
