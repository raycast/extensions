export type TaskType = "personal_task" | "workspace_task";
export type TaskStatus = "unchecked" | "checked" | "done" | "deleted";
export type RecurrenceType =
  | "TASK_REPEAT_DAY"
  | "TASK_REPEAT_WEEK"
  | "TASK_REPEAT_MONTH"
  | "TASK_REPEAT_YEAR";

export interface AnyDoList {
  list_id: string;
  title: string;
}

export interface AnyDoTask {
  task_type: TaskType;
  task_id: string;
  list_id: string;
  title: string;
  status: TaskStatus;
  /** ISO-8601 datetime (with a time) when the task has one. */
  datetime?: string | null;
  /** YYYY-MM-DD for all-day tasks. */
  date?: string | null;
  note?: string | null;
}

export interface AnyDoSubtask {
  task_id: string;
  subtask_id: string;
  title: string;
  status: TaskStatus;
  owners?: string[] | null;
}

export interface AnyDoSpace {
  id?: string;
  space_id?: string;
  name?: string;
  title?: string;
}

export interface AnyDoBoard {
  id?: string;
  board_id?: string;
  name?: string;
  title?: string;
  space_id?: string;
}

export interface AnyDoSection {
  id?: string;
  section_id?: string;
  name?: string;
  title?: string;
  board_id?: string;
}

export interface AnyDoCalendar {
  id: string;
  name: string;
  provider?: string;
  credential_id?: string;
}

/** Calendar events come back with slightly different keys depending on the provider. */
export interface AnyDoEvent {
  id?: string;
  event_id?: string;
  /** Calendar id — returned in `name` by Any.do's API. */
  name?: string;
  title?: string;
  summary?: string;
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
  location?: string | null;
  calendar_id?: string;
  event_url?: string;
  url?: string;
}

export interface AnyDoUser {
  email: string;
  name: string;
  public_user_id: string;
  timezone: string;
}

export interface GetTasksParams {
  from_datetime?: string;
  to_datetime?: string;
  list_id?: string;
  search_query?: string;
  limit?: number;
  cursor?: string;
}

export interface TaskUpdate {
  task_id: string;
  task_type: TaskType;
  title?: string | null;
  note?: string | null;
  /** Any.do's MCP server only accepts these two values when updating. */
  status?: "unchecked" | "checked" | null;
  list_id?: string | null;
}

export interface NewTaskInput {
  listId: string;
  title: string;
  note?: string | null;
  /** Local ISO-8601 without offset; the server reads it in the user's Any.do timezone. */
  datetime?: string | null;
}
