import { useState, useEffect } from "react";
import { useCache } from "../../cache";
import { gitlab } from "../../common";
import { Todo } from "../../gitlabapi";
import { daysInSeconds } from "../../utils";

export function useTodos(search?: string): {
  todos: Todo[];
  error?: string;
  isLoading: boolean;
  performRefetch: () => void;
} {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { data, isLoading, error, performRefetch } = useCache<Todo[]>(
    `todos`,
    async (): Promise<Todo[]> => {
      return await gitlab.getTodos({ search: search || "" }, true);
    },
    {
      deps: [],
      secondsToRefetch: 1,
      secondsToInvalid: daysInSeconds(7),
    }
  );
  useEffect(() => {
    setTodos(data || []);
  }, [data]);
  return { todos, isLoading, error, performRefetch };
}
