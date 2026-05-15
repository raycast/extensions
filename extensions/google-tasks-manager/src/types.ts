export interface TaskList {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  due?: string;
  completed?: string;
  parent?: string;
  notes?: string;
}

export interface TaskForm {
  title: string;
  notes?: string;
  due: Date | null;
}

export enum Filter {
  All = "all",
  Open = "open",
  Completed = "completed",
}
