import { Task, TodoistApi } from "@doist/todoist-api-typescript";
import { Color, getApplications, getPreferenceValues, Icon } from "@raycast/api";
import { randomUUID } from "crypto";
import { format, formatISO, isSameDay, previousSunday } from "date-fns";
import fetch from "node-fetch";
import RemoveMarkdown from "remove-markdown";
import { PreferenceError } from "../../helpers/errors";
import { DetailedTodo, Subset, Todo, TodoCore, TodoGroup, TodoStatus, UniversalListKey } from "../../types";
import { OptionalAction, QueryFilter, TodoFormData, TodoSourceList, UpdateTodoData } from "./types";

type TodoistList = "inbox" | "today" | "upcoming";

export const TODOIST_SOURCE_ID = "o";

// `id` is used as `filter`.
export const todoistList: Record<TodoistList, TodoSourceList> = {
  inbox: { type: "list", id: "#Inbox", title: "Inbox", icon: Icon.Tray },
  today: { type: "list", id: "today|overdue", title: "Today", isToday: true, icon: Icon.Star },
  upcoming: {
    type: "list",
    id: "!no date",
    title: "Upcoming",
    icon: { light: "light/calendar-alt.svg", dark: "dark/calendar-alt.svg" },
  },
} as const;

interface Event {
  event_date: string;
  event_type: "completed";
  extra_data: {
    content: string;
  };
  object_id: string;
  object_type: "item";
  parent_item_id: string | null;
  parent_project_id: string; // even Inbox is a project
}

interface ActivityData {
  count: number;
  events: Event[];
}

const { todoistAPIToken } = getPreferenceValues<{ todoistAPIToken: string }>();

let api: TodoistApi | null = null;

let _isTodoistInstalled: boolean | null = null;

export const TODOIST_APP_URL_PREFIX = "todoist://task?id=";

export const TODOIST_WEB_URL_PREFIX = "https://todoist.com/showTask?id=";

export const todoistPriorities = {
  4: { name: "1", color: Color.Red, icon: Icon.Flag },
  3: { name: "2", color: Color.Orange, icon: Icon.Flag },
  2: { name: "3", color: Color.Blue, icon: Icon.Flag },
  1: { name: "4", color: Color.SecondaryText, icon: Icon.Flag },
};

export const enabledAction: Record<OptionalAction, boolean> = {
  setStartDate: false,
  setPriority: true,
  markAsCanceled: false,
};

const syncAPIBaseURL = "https://api.todoist.com/sync/v9";

// let syncToken = "*";

const universalListFilter: Record<UniversalListKey, string> = {
  today: "today|overdue",
  upcoming: "due after: today",
};

function initializeAPI() {
  if (todoistAPIToken === "") {
    // Throw an error with an explicit message since the `TodoistRequestError` thrown when the API token is an empty
    // string merely says "Request failed with status code 400" and its `isAuthenticationError()` is also `false`.
    throw new PreferenceError(
      "Please enter your Todoist API token in Raycast Settings. Your API token can be found in the Todoist app under Settings > Integrations > Developer.",
      "extension",
      {
        title: "Todoist Settings",
        url: "https://todoist.com/app/settings/integrations/developer",
      }
    );
  }

  return new TodoistApi(todoistAPIToken);
}

export function getInvalidAPITokenError(): PreferenceError {
  return new PreferenceError(
    "Please enter a valid Todoist API token in Raycast Settings. Your API token can be found in the Todoist app under Settings > Integrations > Developer.",
    "extension",
    {
      title: "Todoist Settings",
      url: "https://todoist.com/app/settings/integrations/developer",
    }
  );
}

async function isTodoistInstalled() {
  if (_isTodoistInstalled === null) {
    const applications = await getApplications();
    const todoistApp = applications.find((app) => app.bundleId === "com.todoist.mac.Todoist");
    _isTodoistInstalled = !!todoistApp;
  }
  return _isTodoistInstalled;
}

async function fetchSyncAPI<T>(endpoint: string, method: string, body?: URLSearchParams) {
  const response = await fetch(syncAPIBaseURL + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${todoistAPIToken}`,
    },
    body,
  });

  if (!response.ok) {
    const { error, error_extra } = (await response.json()) as { error: string; error_extra: unknown };

    if (response.status === 401 || response.status === 403) {
      throw getInvalidAPITokenError();
    }

    throw new Error(`${response.status} ${response.statusText}: ${error} ${JSON.stringify(error_extra)}`);
  }

  return (await response.json()) as T;
}

function transformTask(
  { id, content, projectId, due, priority, labels, url, description }: Task,
  isAppInstalled: boolean
): DetailedTodo {
  return {
    sourceId: TODOIST_SOURCE_ID,
    todoId: id,
    status: TodoStatus.open,
    title: RemoveMarkdown(content),
    startDate: null,
    dueDate: due ? new Date(due.datetime ?? due.date + "T00:00:00") : null,
    completionDate: null,
    priority: priority,
    group: projectId ? { type: "project", id: projectId } : null,
    tagIds: labels.length > 0 ? labels : null,
    url: isAppInstalled ? TODOIST_APP_URL_PREFIX + id : url,
    notes: description,
  };
}

function transformEvent(event: Event, isAppInstalled: boolean): Todo {
  return {
    sourceId: TODOIST_SOURCE_ID,
    todoId: event.object_id,
    status: TodoStatus.completed,
    title: RemoveMarkdown(event.extra_data.content),
    startDate: null,
    dueDate: null,
    completionDate: new Date(event.event_date),
    group: event.parent_project_id ? { type: "project", id: event.parent_project_id } : null,
    tagIds: null,
    url: (isAppInstalled ? TODOIST_APP_URL_PREFIX : TODOIST_WEB_URL_PREFIX) + event.object_id,
  };
}

function getPageNumbers(start: Date, end: Date): (number | null)[] {
  const sundayAtNoon = previousSunday(Date.now());
  // Per Todoist documentation, each page corresponds to a single week, and each week starts at Sunday 12:00:00.
  // Documentation doesn't mention the time zone. Assume it is the user time zone, and also assume that the user's
  // current machine time zone matches the user's Todoist time zone.
  sundayAtNoon.setHours(12);
  // Maximum 10 weeks (mentioned in documentation) & as far back as 4 years ago
  const pageNumbers: number[] = [];
  for (let i = 0; pageNumbers.length < 10 && i < 208; i++) {
    if (sundayAtNoon <= end) {
      pageNumbers.push(i);
    }
    if (sundayAtNoon <= start) {
      break;
    }
    sundayAtNoon.setDate(sundayAtNoon.getDate() - 7);
  }

  // Prefer omitting the `page` parameter and get two weeks' worth of events in one API call, since doing so is
  // equivalent to getting `page=0` and `page=1` together per Todoist documentation.
  return pageNumbers.length === 2 && pageNumbers[0] == 0 && pageNumbers[1] === 1 ? [null] : pageNumbers;
}

async function fetchEvents(eventType: string, page: number | null) {
  const endpoint = "/activity/get?event_type=" + eventType + (page ? `&page=${page}` : "");
  const { events } = await fetchSyncAPI<ActivityData>(endpoint, "GET");
  return events;
}

async function getCompletedTodos(start: Date, end: Date, isAppInstalled: boolean): Promise<Todo[]> {
  const pageNumbers = getPageNumbers(start, end);
  // Couldn't figure out `object_event_types` (got all activites)
  // const queryString = encodeURIComponent('object_event_types=["item:completed","item:uncompleted"]');
  // To identify every uncompleted & currently open task, pages 0 through the maximum of `pageNumbers` needs to be
  // requested, but that'd incur too many API requests. Get just the current and last week's uncompletion events.
  // There's one more filtering in `getTodos()` for the tasks that have due dates at least.
  const [completedEvents, { events: uncompletedEvents }] = await Promise.all([
    Promise.all(pageNumbers.map((page) => fetchEvents("completed", page))).then((arrays) => arrays.flat()),
    fetchSyncAPI<ActivityData>("/activity/get?event_type=uncompleted", "GET"),
  ]);

  const lastUncompletionDates = new Map<string, Date>();
  for (const { object_id, event_date } of uncompletedEvents) {
    const uncompletionDate = new Date(event_date);
    const currentBest = lastUncompletionDates.get(object_id);
    if (!currentBest || currentBest < uncompletionDate) {
      lastUncompletionDates.set(object_id, uncompletionDate);
    }
  }

  const completedTodos = new Map<string, Todo>();
  for (const event of completedEvents) {
    // Filter out events that are outside of the given interval and uncompleted tasks.
    const completionDate = new Date(event.event_date);
    const lastUncompletionDate = lastUncompletionDates.get(event.object_id);
    if (
      start <= completionDate &&
      completionDate <= end &&
      (!lastUncompletionDate || lastUncompletionDate < completionDate)
    ) {
      // Keep only the last completion event in case the task was completed multiple times.
      const currentBest = completedTodos.get(event.object_id);
      if (!currentBest || (currentBest.completionDate && currentBest.completionDate < completionDate)) {
        completedTodos.set(event.object_id, transformEvent(event, isAppInstalled));
      }
    }
  }

  return Array.from(completedTodos.values());
}

function getIntervalFilter(start: Date, end: Date): string {
  // Same day 12:00 AM - 11:59 PM doesn't give consistent results, e.g., tasks that are due next day at 12:00 AM, just
  // outside the interval, are included in the result.
  if (
    isSameDay(start, end) &&
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() === 59
  ) {
    return start.toLocaleDateString();
  }
  // Seconds are rejected.
  return `due after: ${format(start, "Pp")} & due before: ${format(end, "Pp")}`;
}

export async function getTodos({ todoIds, listId, interval }: QueryFilter): Promise<Todo[]> {
  if (!api) {
    api = initializeAPI();
  }

  const isAppInstalled = await isTodoistInstalled();

  if (todoIds) {
    const tasks = await api.getTasks({ ids: todoIds });
    return tasks.map((task) => transformTask(task, isAppInstalled));
  }

  if (listId) {
    const filter = listId in universalListFilter ? universalListFilter[listId as UniversalListKey] : listId;
    const tasks = await api.getTasks({ filter });
    return tasks.map((task) => transformTask(task, isAppInstalled));
  }

  if (interval) {
    const start = new Date(interval.start);
    const end = new Date(interval.end);
    const filter = getIntervalFilter(start, end);
    const [completedTodos, openTasks] = await Promise.all([
      getCompletedTodos(start, end, isAppInstalled),
      api.getTasks({ filter }),
    ]);
    const openTodos = openTasks.map((task) => transformTask(task, isAppInstalled));
    const openTodoIds = new Set(openTodos.map(({ todoId }) => todoId));
    const todos = completedTodos.filter(({ todoId }) => !openTodoIds.has(todoId));
    todos.push(...openTodos);
    return todos;
  }

  return [];
}

export async function getDetailedTodo(id: string): Promise<DetailedTodo> {
  if (!api) {
    api = initializeAPI();
  }

  const [task, isAppInstalled] = await Promise.all([api.getTask(id), isTodoistInstalled()]);
  return transformTask(task, isAppInstalled);
}

export async function getProjects(): Promise<TodoGroup[]> {
  if (!api) {
    api = initializeAPI();
  }

  const projects = await api.getProjects();
  return projects.map(({ id, parentId, name }) => ({
    type: "project",
    id,
    title: name,
    parentId,
  }));
}

export async function getTags(): Promise<[string, string][]> {
  if (!api) {
    api = initializeAPI();
  }

  const tags = await api.getLabels();
  // Use `name` as `id` since Todoist Task API accepts label names, not label ids.
  return tags.sort(({ order: aOrder }, { order: bOrder }) => aOrder - bOrder).map(({ name }) => [name, name]);
}

function formatDate(date: Date) {
  return formatISO(date, { representation: "date" });
}

export async function createTodo({
  title,
  dueDate,
  priority,
  group,
  tags,
  notes,
}: TodoFormData): Promise<Pick<TodoCore, "todoId" | "url">> {
  if (!api) {
    api = initializeAPI();
  }

  const { id: todoId, url } = await api.addTask({
    content: title,
    dueDate: dueDate ? formatDate(dueDate) : undefined,
    priority: priority,
    projectId: group.id,
    labels: tags?.map(({ name }) => name),
    description: notes ?? undefined,
  });

  return { todoId, url };
}

async function move(id: string, projectId: string) {
  /*const { sync_token } =*/ await fetchSyncAPI<{ sync_token: string }>(
    "/sync",
    "POST",
    new URLSearchParams({
      commands: JSON.stringify([
        {
          type: "item_move",
          uuid: randomUUID(),
          args: { id, project_id: projectId },
        },
      ]),
    })
  );
  // syncToken = sync_token;
}

export async function updateTodo<T extends Partial<UpdateTodoData>>(
  todoId: string,
  { title, status, startDate, dueDate, priority, group, tags, notes }: Subset<Partial<UpdateTodoData>, T>
): Promise<void> {
  if (!api) {
    api = initializeAPI();
  }

  const newDate = dueDate ?? startDate;

  await Promise.all([
    title || startDate || dueDate || priority || notes || tags
      ? api.updateTask(todoId, {
          content: title,
          dueDate: newDate ? formatDate(newDate) : undefined,
          dueString: dueDate === null ? "no due date" : undefined,
          description: notes ?? undefined,
          labels: tags?.map(({ name }) => name),
          priority: priority,
        })
      : Promise.resolve(),

    status !== undefined
      ? status === TodoStatus.open
        ? api.reopenTask(todoId)
        : api.closeTask(todoId)
      : Promise.resolve(),

    group ? move(todoId, group.id) : Promise.resolve(),
  ]);
}

export async function deleteTodo(todoId: string): Promise<void> {
  if (!api) {
    api = initializeAPI();
  }

  await api.deleteTask(todoId);
}
