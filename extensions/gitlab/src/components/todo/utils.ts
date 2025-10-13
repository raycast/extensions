import { useState, useEffect } from "react";
import { useCache } from "../../cache";
import { getExcludeTodoAuthorUsernamesPreference, gitlab } from "../../common";
import { Project, Todo } from "../../gitlabapi";
import { daysInSeconds } from "../../utils";

export function useTodos(
  search?: string,
  project?: Project | undefined,
): {
  todos: Todo[];
  error?: string;
  isLoading: boolean | undefined;
  performRefetch: () => void;
} {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { data, isLoading, error, performRefetch } = useCache<Todo[]>(
    `todos`,
    async (): Promise<Todo[]> => {
      const todos = await gitlab.getTodos({ search: search || "" }, true);
      const excludeAuthorUsernames = getExcludeTodoAuthorUsernamesPreference();
      return todos.filter((todo: Todo) => !todo.author || !excludeAuthorUsernames.includes(todo.author.username));
    },
    {
      deps: [],
      secondsToRefetch: 1,
      secondsToInvalid: daysInSeconds(7),
    },
  );
  useEffect(() => {
    const todosFiltered = project
      ? data?.filter((t) => t.project_with_namespace === project?.name_with_namespace)
      : data;
    setTodos(todosFiltered || []);
  }, [data, project]);
  return { todos, isLoading, error, performRefetch };
}
