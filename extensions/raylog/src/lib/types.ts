export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskViewFilter =
  | "all"
  | "open"
  | "todo"
  | "in_progress"
  | "due_soon"
  | "done"
  | "archived";
export type TaskListViewMode = "summary" | "list";

export type TaskLogStatusBehavior = "auto_start" | "keep_status" | "prompt";

export interface RaylogViewState {
  hasSelectedListTasksFilter: boolean;
  listTasksFilter: TaskViewFilter;
  hasSelectedListViewMode: boolean;
  listViewMode: TaskListViewMode;
}

export interface TaskRecord {
  id: string;
  header: string;
  body: string;
  workLogs: TaskWorkLogRecord[];
  status: TaskStatus;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWorkLogRecord {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface RaylogDocument {
  schemaVersion: number;
  tasks: TaskRecord[];
  viewState: RaylogViewState;
}

export interface TaskInput {
  header: string;
  body?: string;
  workLogs?: TaskWorkLogRecord[];
  status?: TaskStatus;
  dueDate?: string | null;
  startDate?: string | null;
}

export interface TaskWorkLogInput {
  body: string;
}
