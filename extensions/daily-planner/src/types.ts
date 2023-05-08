import { Color, Icon } from "@raycast/api";
import { todoSourceId } from "./api/todo-source";
import { universalList } from "./components/TodoListDropdown";

export type UniversalListKey = (typeof universalList)[keyof typeof universalList]["id"];

export type TodoSourceId = (typeof todoSourceId)[keyof typeof todoSourceId];

// Sames as Things `TMTask.status` values
export enum TodoStatus {
  open = 0,
  canceled = 2,
  completed = 3,
}

// A set of properties shared by Todo & TodoItem
export interface TodoCore {
  readonly sourceId: TodoSourceId;
  readonly todoId: string;
  readonly url: string;
  readonly title: string;
  readonly startDate: Date | null;
  readonly dueDate: Date | null;
  readonly completionDate: Date | null;
  readonly childIds?: string[]; // for Reminders only
}

// Returned by `TodoSource`
export interface Todo extends TodoCore {
  readonly status: TodoStatus;
  readonly priority?: number;
  readonly group: Pick<TodoGroup, "type" | "id"> | null;
  readonly tagIds?: string[] | null;
}

export interface DetailedTodo extends Todo {
  readonly notes: string | null;
  readonly concatenatedChecklistItems?: string | null;
}

export interface TodoPriority {
  value: number;
  name: string;
  color: Color;
  icon: Icon;
}

// list: app-default lists, e.g., Reminders Today/Scheduled/All/Flagged/Completed, Things Inbox/Today/Upcoming/Anytime/Someday/Logbook
// area: user-created project & to-do container (Things only)
// project: user-created lists, e.g., Reminders List, Things Project, Todoist Project
// These are also AppleScript keywords for Things and should not be renamed.
export type TodoGroupType = "list" | "area" | "project";

export interface TodoGroupCore {
  type: TodoGroupType;
  id: string;
  title: string;
}

// `List` or `TodoList` would be a better name, but unfortunately, those are component names.
export interface TodoGroup extends TodoGroupCore {
  isLocked?: boolean; // If `true`, this group doesn't show up as a "Move" destination. (e.g., Reminders Groups)
  parentId?: string | null;
  subgroups?: TodoGroup[];
}

export interface TodoTag {
  id: string;
  name: string;
}

type URLRequired<T extends { url?: string | null }> = Omit<T, "url"> & {
  readonly url: string;
};

export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly start: number;
  readonly end: number;
  readonly url: string | null;
}

export type Block = URLRequired<CalendarEvent>;

export interface CalendarEventForReport extends CalendarEvent {
  readonly hasAttendees: number; // boolean represented as number;
  readonly rsvpStatus: 0 | 1 | 2 | 3 | null;
}

export type TimeEntryIdType = number | string; // number for Toggl, string for Calendar & Clockify

export interface TimeEntry {
  readonly id: TimeEntryIdType;
  readonly title: string;
  readonly start: number;
  readonly end: number | null;
  readonly url?: string; // for Calendar only
  readonly userId?: TimeEntryIdType | null; // for Clockify only
  readonly workspaceId?: TimeEntryIdType; // for Toggl & Clockify only
}

export type CalendarTimeEntry = URLRequired<TimeEntry>;

export type CacheableTimeEntry = URLRequired<TimeEntry>;

export interface DateInterval {
  start: Date;
  end: Date;
}

export interface TimeValueInterval {
  start: number;
  end: number;
}

export type MakeNullable<T, K extends keyof T> = Omit<T, K> & {
  [P in keyof Pick<T, K>]: Pick<T, K>[P] | null;
};

export type Exact<A, B> = A extends B ? (B extends A ? A : never) : never;

type Ban<K extends PropertyKey> = {
  [P in K]: never;
};

export type Subset<T, U extends T = T> = U & Ban<Exclude<keyof U, keyof T>>;
