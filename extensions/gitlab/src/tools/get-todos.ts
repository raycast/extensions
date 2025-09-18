import { gitlab } from "../common";
import type { Todo } from "../gitlabapi";

type Input = {
  /** Optional filter by action or target type, e.g., action_name=pending */
  search?: string;
};

export default async function ({ search }: Input) {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  const todos: Todo[] = await gitlab.getTodos(params, true);

  return todos;
}
