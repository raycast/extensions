import { TodoistRequestError } from "@doist/todoist-api-typescript";
import { useCachedPromise, useSQL } from "@raycast/utils";
import { useMemo } from "react";
import {
  activeSourceIds,
  getInvalidTodoistAPITokenError,
  getThingsDBPath,
  getTodoistTags,
  tagsQuery,
  todoSourceId,
} from "../api/todo-source";
import { TodoSourceId, TodoTag } from "../types";

function useThingsTags({ execute }: { execute?: boolean }) {
  const path = getThingsDBPath();
  const { isLoading, data, error, revalidate } = useSQL<TodoTag>(path, tagsQuery, {
    execute: execute !== false,
  });
  const tags = useMemo(() => new Map(data?.map(({ id, name }) => [id, name])), [data]);
  return { isLoadingThings: isLoading, thingsTags: tags, thingsError: error, revalidateThings: revalidate };
}

function useTodoistTags({ execute }: { execute?: boolean }) {
  const { isLoading, data, error, revalidate } = useCachedPromise(getTodoistTags, [], {
    execute: execute !== false,
  });

  const tags = useMemo(() => new Map(data), [data]);
  const todoistError =
    error instanceof TodoistRequestError && error.isAuthenticationError() ? getInvalidTodoistAPITokenError() : error;

  return { isLoadingTodoist: isLoading, todoistTags: tags, todoistError, revalidateTodoist: revalidate };
}

export default function useTodoTags(options?: { execute?: boolean }): {
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined;
  todoTagsError: Error | undefined;
  isLoadingTodoTags: boolean;
  revalidateTodoTags: () => Promise<void>;
} {
  const executeThings = activeSourceIds.includes(todoSourceId.things) && options?.execute !== false;
  const { isLoadingThings, thingsTags, thingsError, revalidateThings } = useThingsTags({
    execute: executeThings,
  });

  const executeTodoist = activeSourceIds.includes(todoSourceId.todoist) && options?.execute !== false;
  const { isLoadingTodoist, todoistTags, todoistError, revalidateTodoist } = useTodoistTags({
    execute: executeTodoist,
  });

  const tags = useMemo(
    () =>
      new Map<TodoSourceId, Map<string, string>>([
        [todoSourceId.things, thingsTags],
        [todoSourceId.todoist, todoistTags],
      ]),
    [thingsTags, todoistTags]
  );

  const revalidateTodoTags = async () => {
    await Promise.all([
      executeThings ? revalidateThings() : Promise.resolve(),
      executeTodoist ? revalidateTodoist() : Promise.resolve(),
    ]);
  };

  return {
    todoTags: tags,
    todoTagsError: thingsError ?? todoistError,
    isLoadingTodoTags: isLoadingThings || isLoadingTodoist,
    revalidateTodoTags,
  };
}
