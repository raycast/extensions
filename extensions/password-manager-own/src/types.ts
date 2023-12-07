enum Filter {
  All = "all",
  Open = "open",
  Completed = "completed",
}

interface Password {
  id: string;
  title: string;
  isCompleted: boolean;
  password: string;
}

export { Filter };
export type { Password };
