import { getPreferenceValues } from "@raycast/api";
import { Subset, TodoSourceId, TodoPriority } from "../../types";
import * as reminders from "./reminders";
import { remindersList, remindersPriorities, REMINDERS_SOURCE_ID, REMINDERS_URL_PREFIX } from "./reminders-sql";
import * as things from "./things";
import { thingsList, THINGS_SOURCE_ID, THINGS_URL_PREFIX } from "./things-sql";
import * as todoist from "./todoist";
import { OptionalAction, TodoFormData, TodoSourceList, UpdateTodoData } from "./types";

export type {
  DetailedReminder,
  QueryFilter,
  Reminder,
  ThingsDetailedTask,
  ThingsTask,
  TodoFormData,
  UpdateTodoData,
} from "./types";

export {
  getRemindersDBPath,
  getRemindersTodoQuery,
  listsQuery,
  parseDetailedReminder,
  parseReminder,
} from "./reminders-sql";

export { getThingsMoveDestiationLists, NO_AREA_PROJECT_VALUE } from "./things";

export {
  getThingsDBPath,
  getThingsTodoQuery,
  parseThingsDetailedTask,
  parseThingsTask,
  tagsQuery,
  todoGroupsQuery,
} from "./things-sql";

export {
  getDetailedTodo as getDetailedTodoistTodo,
  getTodos as getTodoistTodos,
  getProjects as getTodoistProjects,
  getTags as getTodoistTags,
  getInvalidAPITokenError as getInvalidTodoistAPITokenError,
} from "./todoist";

type TodoSourceIdPrefixed<Str extends string> = `${TodoSourceId}_${Str}`;

export type SourceIdedTodoId = TodoSourceIdPrefixed<string>;

type todoListApp = "reminders" | "things" | "todoist";

interface Preferences {
  primaryTodoSource: todoListApp;
  secondaryTodoSource: todoListApp | "none";
  tertiaryTodoSource: todoListApp | "none";
  taskBlockName: string;
}

interface LaunchContext {
  ids?: SourceIdedTodoId[];
}

const {
  primaryTodoSource,
  secondaryTodoSource,
  tertiaryTodoSource,
  taskBlockName: optionalPrefName,
} = getPreferenceValues<Preferences>();

// `todoSourceId` values are short so they don't elongate task block URLs.
// These are imported from each app module to avoid circular dependencies.
export const todoSourceId = {
  reminders: REMINDERS_SOURCE_ID, // r
  things: THINGS_SOURCE_ID, // t
  todoist: todoist.TODOIST_SOURCE_ID, // o
} as const;

const todoSourceIds = new Set(Object.values(todoSourceId));

export const primaryTodoSourceId = todoSourceId[primaryTodoSource];

export const todoSourceApplicationName: Record<TodoSourceId, string> = {
  [todoSourceId.reminders]: "Reminders",
  [todoSourceId.things]: "Things",
  [todoSourceId.todoist]: "Todoist",
};

export const activeSourceIds = [primaryTodoSource, secondaryTodoSource, tertiaryTodoSource].reduce<TodoSourceId[]>(
  (sourceIds, source) => {
    if (source !== "none" && !sourceIds.includes(todoSourceId[source])) {
      sourceIds.push(todoSourceId[source]);
    }
    return sourceIds;
  },
  []
);

// Lists for `TodoListDropdown`. Every app must designate a "today" list at least.
const todoList: Record<todoListApp, Record<"today" & string, TodoSourceList>> = {
  reminders: remindersList,
  things: thingsList,
  todoist: todoist.todoistList,
};

export const primaryTodoSourceTodayList = todoList[primaryTodoSource].today;

export const todoLists = new Map<TodoSourceId, TodoSourceList[]>([
  [todoSourceId[primaryTodoSource], Array.from(Object.values(todoList[primaryTodoSource]))],
]);

const appendSourceLists = (app: todoListApp) =>
  todoLists.set(todoSourceId[app], Array.from(Object.values(todoList[app])));

if (secondaryTodoSource !== "none") appendSourceLists(secondaryTodoSource);
if (tertiaryTodoSource !== "none") appendSourceLists(tertiaryTodoSource);

// Priorities
export const priorityNameAndColor: Record<TodoSourceId, Record<number, Omit<TodoPriority, "value">> | undefined> = {
  [todoSourceId.reminders]: remindersPriorities,
  [todoSourceId.things]: undefined,
  [todoSourceId.todoist]: todoist.todoistPriorities,
};

// Functions for `Action`s and `Form`s
export const enabledAction: Record<TodoSourceId, Record<OptionalAction, boolean>> = {
  [todoSourceId.reminders]: reminders.enabledAction,
  [todoSourceId.things]: things.enabledAction,
  [todoSourceId.todoist]: todoist.enabledAction,
};

const _createTodo: Record<TodoSourceId, (data: TodoFormData) => Promise<{ todoId: string; url: string }>> = {
  [todoSourceId.reminders]: reminders.createTodo,
  [todoSourceId.things]: things.createTodo,
  [todoSourceId.todoist]: todoist.createTodo,
};

export const createTodo = _createTodo[primaryTodoSourceId];

export const updateTodo: Record<
  TodoSourceId,
  <T extends Partial<UpdateTodoData>>(todoId: string, data: Subset<Partial<UpdateTodoData>, T>) => Promise<void>
> = {
  [todoSourceId.reminders]: reminders.updateTodo,
  [todoSourceId.things]: things.updateTodo,
  [todoSourceId.todoist]: todoist.updateTodo,
};

export const deleteTodo: Record<TodoSourceId, (todoId: string) => Promise<void>> = {
  [todoSourceId.reminders]: reminders.deleteTodo,
  [todoSourceId.things]: things.deleteTodo,
  [todoSourceId.todoist]: todoist.deleteTodo,
};

// Task Block
export const taskBlockName = optionalPrefName ? optionalPrefName : "Task Block";

export const TASK_BLOCK_DEEPLINK_PREFIX = "raycast://extensions/benyn/daily-planner/block-time?";

export const BREAK_BLOCK_DEEPLINK =
  "raycast://extensions/benyn/daily-planner/track-time?context=%7B%22action%22%3A%22stop%22%7D";

const todoSourceURLPrefixes: Record<TodoSourceId, string[]> = {
  [todoSourceId.reminders]: [REMINDERS_URL_PREFIX],
  [todoSourceId.things]: [THINGS_URL_PREFIX],
  [todoSourceId.todoist]: [todoist.TODOIST_APP_URL_PREFIX, todoist.TODOIST_WEB_URL_PREFIX],
};

export function createTaskBlockURL(todoItemIds: SourceIdedTodoId[]): string {
  const context: LaunchContext = { ids: todoItemIds };
  const params = new URLSearchParams({ context: JSON.stringify(context) });
  return TASK_BLOCK_DEEPLINK_PREFIX + params.toString();
}

export function isTaskBlock({ url }: { url?: string | null }): boolean {
  return url?.startsWith(TASK_BLOCK_DEEPLINK_PREFIX) ?? false;
}

export function isBreakBlock({ url }: { url?: string | null }): boolean {
  return url?.startsWith(BREAK_BLOCK_DEEPLINK) ?? false;
}

// Source-identified to-do identifiers
export function getSourceIdedTodoId(sourceId: TodoSourceId, todoId: string): SourceIdedTodoId {
  return `${sourceId}_${todoId}`;
}

function isTodoSourceId(id: string): id is TodoSourceId {
  return todoSourceIds.has(id as TodoSourceId);
}

export function parseSourceIdedTodoId(id: string): { sourceId: TodoSourceId; todoId: string } | undefined {
  const [sourceId, todoId] = id.split("_");
  if (isTodoSourceId(sourceId) && !!todoId) {
    return { sourceId, todoId };
  }
}

function isSourceIdedTodoId(id: string): id is SourceIdedTodoId {
  const [sourceId, todoId] = id.split("_");
  return isTodoSourceId(sourceId) && !!todoId;
}

export function extractSourceIdedTodoIdsInTaskBlockURL(url: string): SourceIdedTodoId[] {
  const paramsStr = url.slice(TASK_BLOCK_DEEPLINK_PREFIX.length);
  if (paramsStr) {
    const params = new URLSearchParams(paramsStr);
    const context = params.get("context");
    if (context) {
      try {
        const { ids } = JSON.parse(context) as LaunchContext;
        return ids?.filter(isSourceIdedTodoId) ?? [];
      } catch (error) {
        console.error(`Failed to parse launch context ${context}\n`, error);
      }
    }
  }
  return [];
}

// Appends `todoItemId` to `url` if it isn't already present. Additionally, this function cleans the URL: it filters out
// any non-conforming `todoItemId`s in the URL and creates a new `DEEPLINK`-prefixed URL.
export function appendToTaskBlockURL(url: string, todoItemId: SourceIdedTodoId): string {
  const ids = extractSourceIdedTodoIdsInTaskBlockURL(url);
  if (!ids.includes(todoItemId)) {
    ids.push(todoItemId);
  }
  return createTaskBlockURL(ids);
}

export function extractSourceIdedTodIdOrIds(url: string): SourceIdedTodoId | SourceIdedTodoId[] | null {
  if (url.startsWith(TASK_BLOCK_DEEPLINK_PREFIX)) {
    return extractSourceIdedTodoIdsInTaskBlockURL(url);
  }
  if (url.startsWith(BREAK_BLOCK_DEEPLINK)) {
    return [];
  }
  if (url.startsWith(REMINDERS_URL_PREFIX)) {
    return getSourceIdedTodoId(todoSourceId.reminders, url.slice(REMINDERS_URL_PREFIX.length));
  }
  if (url.startsWith(THINGS_URL_PREFIX)) {
    return getSourceIdedTodoId(todoSourceId.things, url.slice(THINGS_URL_PREFIX.length));
  }
  if (url.startsWith(todoist.TODOIST_APP_URL_PREFIX)) {
    return getSourceIdedTodoId(todoSourceId.todoist, url.slice(todoist.TODOIST_APP_URL_PREFIX.length));
  }
  if (url.startsWith(todoist.TODOIST_WEB_URL_PREFIX)) {
    return getSourceIdedTodoId(todoSourceId.todoist, url.slice(todoist.TODOIST_WEB_URL_PREFIX.length));
  }
  return null;
}

export function getURLs(sourceIdedTodoId: SourceIdedTodoId): string[] {
  const parsedPair = parseSourceIdedTodoId(sourceIdedTodoId);
  if (!parsedPair) return [];

  const urlPrefixes = todoSourceURLPrefixes[parsedPair.sourceId];
  return urlPrefixes.map((prefix) => prefix + parsedPair.todoId);
}
