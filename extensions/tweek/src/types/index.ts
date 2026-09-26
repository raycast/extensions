export type UpdateType = "only_this" | "this_and_future" | "all_linked";

export type BuiltInColorId =
  | "blank"
  | "pink"
  | "yellowish"
  | "black"
  | "grey"
  | "cornflower"
  | "mango"
  | "greenish"
  | "lilac";

export type DateFormatPreference = "MM/dd/yyyy" | "dd/MM/yyyy";
export type WeekStartPreference = "Monday" | "Sunday";

export interface ExtensionPreferences {
  apiKey: string;
  mcpEndpoint?: string;
  defaultCalendar?: string;
  hideCompleted?: boolean;
  dateFormat?: DateFormatPreference;
  weekStartsOn?: WeekStartPreference;
  defaultTaskColor?: BuiltInColorId | string;
}

export interface TweekSomedayList {
  id: string;
  name: string;
  hidden?: boolean;
  webHidden?: boolean;
}

export interface TweekCalendar {
  id: string;
  name: string;
  ownerId?: string;
  role?: "ROLE_OWNER" | "ROLE_EDITOR" | "ROLE_VIEWER";
  lists: TweekSomedayList[];
  isDefault?: boolean;
}

export interface TweekCustomColor {
  id: string;
  color: string;
  backgroundColor: string;
  name?: string;
}

export interface TweekSubtask {
  id?: string;
  text: string;
  done: boolean;
  highlighted?: boolean | null;
  indent?: number | null;
  variant?: "checklistItem" | "header" | null;
}

export interface TweekTaskSource {
  identifier: string;
  type: "apple" | "reminders";
}

export interface TweekTask {
  id: string;
  calendarId: string;
  text: string;
  done: boolean;
  date: string | null;
  listId?: string | null;
  color?: string | null;
  note?: string | null;
  notifyAt?: string | null;
  checklist?: TweekSubtask[] | null;
  freq?: number | null;
  recurrence?: string | null;
  dtStart?: string | null;
  gcal?: boolean;
  isoDate?: string | null;
  source?: TweekTaskSource | null;
  deleted?: boolean | null;
  virtual?: boolean;
  isBase?: boolean;
  recurringTodoId?: string;
  isBaseDeleted?: boolean;
}

export interface ListTasksParams {
  calendarId: string;
  dateFrom?: string;
  dateTo?: string;
  listId?: string;
  expand?: boolean;
  timezone?: string;
  startAt?: string;
}

export interface PaginatedTasksResponse {
  data: TweekTask[];
  pageSize?: number;
  nextDocId: string | null;
}

export interface CreateTaskInput {
  calendarId: string;
  text: string;
  done?: boolean;
  date?: string | null;
  listId?: string | null;
  color?: string | null;
  note?: string | null;
  notifyAt?: string | null;
  checklist?: Array<{ id?: string; text: string; done?: boolean }>;
  freq?: number | null;
  recurrence?: string | null;
  dtStart?: string | null;
  gcal?: boolean;
}

export interface UpdateTaskInput {
  calendarId?: string;
  text?: string;
  done?: boolean;
  date?: string | null;
  listId?: string | null;
  color?: string | null;
  note?: string | null;
  notifyAt?: string | null;
  checklist?: Array<{ id?: string; text: string; done?: boolean }>;
  freq?: number | null;
  recurrence?: string | null;
  dtStart?: string | null;
}

export interface BulkUpdateItem extends UpdateTaskInput {
  taskId: string;
  updateType?: UpdateType;
}

export interface BulkOperationResult {
  succeeded: Array<{ index: number; id: string }>;
  failed: Array<{ index: number; error: string }>;
}

export type DateFilterPreset =
  "all" | "today" | "this_week" | "overdue" | "someday" | "upcoming_14_days";

export interface TaskFilterState {
  searchText: string;
  calendarId: string;
  datePreset: DateFilterPreset;
  colorFilter: string; // "all" or specific color id
  hideCompleted: boolean;
  somedayListId: string; // "all" or specific listId
}
