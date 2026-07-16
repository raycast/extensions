import { useCachedPromise } from "@raycast/utils";
import { getExcludeTodoAuthorUsernamesPreference, gitlab } from "../../common";
import { MergeRequest, Project, Todo } from "../../gitlabapi";
import { getErrorMessage } from "../../utils";

export function findTodoForMR(todos: Todo[], mr: MergeRequest): Todo | undefined {
  return todos.find(
    (todo) =>
      todo.target_type === "MergeRequest" &&
      (todo.target?.id === mr.id || (todo.target?.iid === mr.iid && todo.target?.project_id === mr.project_id)),
  );
}

export function useTodos(
  search?: string,
  project?: Project | undefined,
): {
  todos: Todo[];
  error?: string;
  isLoading: boolean | undefined;
  performRefetch: () => void;
} {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (): Promise<Todo[]> => {
      const todos = await gitlab.getTodos({ search: search || "" }, true);
      const excludeAuthorUsernames = getExcludeTodoAuthorUsernamesPreference();
      return todos.filter((todo: Todo) => !todo.author || !excludeAuthorUsernames.includes(todo.author.username));
    },
    [],
    { initialData: [] },
  );
  const todos = project ? data.filter((todo) => todo.project_with_namespace === project.name_with_namespace) : data;
  return { todos, isLoading, error: error ? getErrorMessage(error) : undefined, performRefetch: revalidate };
}
