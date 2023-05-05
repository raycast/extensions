import { useCachedPromise, useSQL } from "@raycast/utils";
import { useMemo } from "react";
import {
  DetailedReminder,
  getDetailedTodoistTodo,
  getRemindersDBPath,
  getRemindersTodoQuery,
  getThingsDBPath,
  getThingsTodoQuery,
  parseDetailedReminder,
  parseThingsDetailedTask,
  ThingsDetailedTask,
  todoSourceId,
} from "../api/todo-source";
import { TodoReportItem } from "../helpers/report";
import { TodoItem } from "../helpers/todoList";
import { DetailedTodo } from "../types";

function useReminders(todoId: string, { execute }: { execute: boolean }) {
  const path = getRemindersDBPath();
  const query = getRemindersTodoQuery({ todoIds: [todoId], forDetail: true });
  const { isLoading, data, error, revalidate } = useSQL<DetailedReminder>(path, query, { execute: execute });
  const todos = useMemo(() => data?.map((task) => parseDetailedReminder(task)), [data]);

  return {
    isLoadingReminders: isLoading,
    remindersTodo: todos?.at(0),
    remindersError: error,
    revalidateReminders: revalidate,
  };
}

function useThings(todoId: string, { execute }: { execute: boolean }) {
  const path = getThingsDBPath();
  const query = getThingsTodoQuery({ todoIds: [todoId], forDetail: true });
  const { isLoading, data, error, revalidate } = useSQL<ThingsDetailedTask>(path, query, { execute });
  const todos = useMemo(() => data?.map((task) => parseThingsDetailedTask(task)), [data]);

  return { isLoadingThings: isLoading, thingsTodo: todos?.at(0), thingsError: error, revalidateThings: revalidate };
}

function useTodoist(listItem: TodoItem | TodoReportItem, { execute }: { execute: boolean }) {
  const { isLoading, data, error, revalidate } = useCachedPromise(getDetailedTodoistTodo, [listItem.todoId], {
    initialData: [
      {
        ...listItem,
        notes: "",
      },
    ],
    execute,
  });

  return { isLoadingTodoist: isLoading, todoistTodo: data, todoistError: error, revalidateTodoist: revalidate };
}

export default function useDetailedTodo(listItem: TodoItem | TodoReportItem): {
  todo: DetailedTodo | null | undefined;
  todoError: Error | undefined;
  isLoadingTodo: boolean;
  revalidateTodo: () => Promise<void>;
} {
  const { sourceId, todoId } = listItem;

  const { isLoadingReminders, remindersTodo, remindersError, revalidateReminders } = useReminders(todoId, {
    execute: sourceId === todoSourceId.reminders,
  });

  const { isLoadingThings, thingsTodo, thingsError, revalidateThings } = useThings(todoId, {
    execute: sourceId === todoSourceId.things,
  });

  const { isLoadingTodoist, todoistTodo, todoistError, revalidateTodoist } = useTodoist(listItem, {
    execute: sourceId === todoSourceId.todoist,
  });

  const revalidateTodo = async () => {
    if (sourceId === todoSourceId.reminders) await revalidateReminders();
    else if (sourceId === todoSourceId.things) await revalidateThings();
    else revalidateTodoist();
  };

  return {
    todo: remindersTodo ?? thingsTodo ?? todoistTodo,
    todoError: remindersError ?? thingsError ?? todoistError,
    isLoadingTodo: isLoadingReminders || isLoadingThings || isLoadingTodoist,
    revalidateTodo,
  };
}
