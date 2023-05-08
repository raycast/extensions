import { TodoistRequestError } from "@doist/todoist-api-typescript";
import { useCachedPromise, useSQL } from "@raycast/utils";
import { useMemo } from "react";
import {
  activeSourceIds,
  getInvalidTodoistAPITokenError,
  getRemindersDBPath,
  getRemindersTodoQuery,
  getThingsDBPath,
  getThingsTodoQuery,
  getTodoistTodos,
  parseReminder,
  parseThingsTask,
  QueryFilter,
  Reminder,
  ThingsTask,
  todoSourceId,
} from "../api/todo-source";
import { TimeValueInterval, Todo, TodoSourceId } from "../types";

interface UseTodosParams {
  list?: { sourceId?: TodoSourceId; id: string };
  ids?: Map<TodoSourceId, Todo["todoId"][]>;
  interval?: TimeValueInterval;
}

function useReminders(filter: QueryFilter, { execute }: { execute: boolean }) {
  const path = getRemindersDBPath();
  const query = getRemindersTodoQuery(filter);
  const { isLoading, data, error, revalidate, permissionView } = useSQL<Reminder>(path, query, { execute: execute });
  const todos = useMemo(() => data?.map((task) => parseReminder(task)), [data]);
  return {
    isLoadingReminders: isLoading,
    remindersTodos: todos,
    remindersError: error,
    revalidateReminders: revalidate,
    permissionView,
  };
}

function useThings(filter: QueryFilter, { execute }: { execute: boolean }) {
  const path = getThingsDBPath();
  const query = getThingsTodoQuery(filter);
  const { isLoading, data, error, revalidate } = useSQL<ThingsTask>(path, query, { execute });
  const todos = useMemo(() => data?.map((task) => parseThingsTask(task)), [data]);
  return { isLoadingThings: isLoading, thingsTodos: todos, thingsError: error, revalidateThings: revalidate };
}

function useTodoist(filter: QueryFilter, { execute }: { execute: boolean }) {
  const { isLoading, data, error, revalidate } = useCachedPromise(getTodoistTodos, [filter], {
    execute,
  });

  const todoistError =
    error instanceof TodoistRequestError && error.isAuthenticationError() ? getInvalidTodoistAPITokenError() : error;

  return { isLoadingTodoist: isLoading, todoistTodos: data, todoistError, revalidateTodoist: revalidate };
}

function toQueryFilters({ list, ids, interval }: UseTodosParams): Map<TodoSourceId, QueryFilter> {
  if (list) {
    const { sourceId, id: listId } = list;
    const queryFilter: QueryFilter = { listId, interval };
    return new Map(sourceId ? [[sourceId, queryFilter]] : activeSourceIds.map((sourceId) => [sourceId, queryFilter]));
  }

  if (ids) {
    // return new Map(ids.map(({ sourceId, todoIds }) => [sourceId, { todoIds, interval }]));
    return new Map(Array.from(ids, ([sourceId, todoIds]) => [sourceId, { todoIds, interval }]));
  }

  if (interval) {
    return new Map(activeSourceIds.map((sourceId) => [sourceId, { interval }]));
  }

  return new Map();
}

export default function useTodos(params: UseTodosParams): {
  todos: Todo[] | undefined;
  todosError: Error | undefined;
  isLoadingTodos: boolean;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  permissionView: JSX.Element | undefined;
} {
  const filters = toQueryFilters(params);

  const remindersFilter = filters.get(todoSourceId.reminders);
  const { isLoadingReminders, remindersTodos, remindersError, revalidateReminders, permissionView } = useReminders(
    remindersFilter ?? {},
    {
      execute: !!remindersFilter,
    }
  );

  const thingsFilter = filters.get(todoSourceId.things);
  const { isLoadingThings, thingsTodos, thingsError, revalidateThings } = useThings(thingsFilter ?? {}, {
    execute: !!thingsFilter,
  });

  const todoistFilter = filters.get(todoSourceId.todoist);
  const { isLoadingTodoist, todoistTodos, todoistError, revalidateTodoist } = useTodoist(todoistFilter ?? {}, {
    execute: !!todoistFilter,
  });

  const sourceTodos: Record<TodoSourceId, Todo[] | undefined> = {
    [todoSourceId.reminders]: remindersTodos,
    [todoSourceId.things]: thingsTodos,
    [todoSourceId.todoist]: todoistTodos,
  };

  const todos = Array.from(filters.keys()).flatMap((sourceId) => sourceTodos[sourceId] ?? []);

  const revalidateTodos = async (sourceId?: TodoSourceId) => {
    await Promise.all([
      remindersFilter && (!sourceId || sourceId === todoSourceId.reminders) ? revalidateReminders() : Promise.resolve(),
      thingsFilter && (!sourceId || sourceId === todoSourceId.things) ? revalidateThings() : Promise.resolve(),
      todoistFilter && (!sourceId || sourceId === todoSourceId.todoist) ? revalidateTodoist() : Promise.resolve(),
    ]);
  };

  return {
    todos,
    todosError: remindersError ?? thingsError ?? todoistError,
    isLoadingTodos: isLoadingReminders || isLoadingThings || isLoadingTodoist,
    revalidateTodos: revalidateTodos,
    permissionView,
  };
}
