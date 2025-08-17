export enum Filter {
  All = "all",
  Open = "open",
  Completed = "completed",
}

export interface Todo {
  id: string;
  title: string;
  isCompleted: boolean;
}
