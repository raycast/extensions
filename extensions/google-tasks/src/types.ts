export enum Filter {
  All = "all",
  Open = "open",
  Completed = "completed",
}

export interface Task {
  id: string;
  title: string;
  status: string;
  due?: string;
  completed?: string;
  parent?: string;
  notes?: string;
  children?: Task[];
}

export interface TaskForm {
  title: string;
  notes?: string;
  due: Date | null;
}

export interface TaskGroups {
  name: string;
  tasks: Task[];
}
