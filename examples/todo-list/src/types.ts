enum Filter {
  All = "all",
  Open = "open",
  Completed = "completed",
}

interface Todo {
  id: string;
  title: string;
  isCompleted: boolean;
}

export { Filter };
export type { Todo };
