/**
 * TypeScript interfaces for Pinwork data types.
 * These mirror the AppleScript scriptable objects defined in Pinwork.sdef.
 */

// MARK: - Task Status

export type TaskStatus =
  | "active"
  | "inProgress"
  | "done"
  | "canceled"
  | "somedayMaybe"
  | "waiting";

export const TaskStatusDisplay: Record<TaskStatus, string> = {
  active: "Active",
  inProgress: "In Progress",
  done: "Done",
  canceled: "Canceled",
  somedayMaybe: "Someday",
  waiting: "Waiting",
};

// MARK: - Task

export interface Task {
  /** Unique identifier (UUID) */
  id: string;
  /** Task title */
  title: string;
  /** Task notes (Markdown supported) */
  notes?: string;
  /** Current status */
  status: TaskStatus;
  /** Scheduled date (do-date) */
  scheduledDate?: Date;
  /** Whether scheduled date has a specific time */
  scheduledDateHasTime: boolean;
  /** Deadline (due-date) */
  deadline?: Date;
  /** Time estimate in minutes */
  estimate?: number;
  /** Parent project ID */
  projectId?: string;
  /** Parent project name (for display) */
  projectName?: string;
  /** Tags assigned to the task */
  tags: string[];
  /** Whether task is completed */
  isCompleted: boolean;
  /** Whether task has recurrence */
  isRecurring: boolean;
  /** When task was created */
  createdAt: Date;
  /** When task was last modified */
  modifiedAt: Date;
  /** When task was completed */
  completedAt?: Date;
}

// MARK: - Project

export interface Project {
  /** Unique identifier (UUID) */
  id: string;
  /** Project name */
  name: string;
  /** Project color as hex string */
  color?: string;
  /** Project note/description */
  note?: string;
  /** Number of active tasks */
  taskCount: number;
  /** Whether project is archived */
  isArchived: boolean;
}

// MARK: - Tag

export interface Tag {
  /** Tag name (unique identifier) */
  name: string;
  /** Number of tasks with this tag */
  taskCount: number;
}

// MARK: - Defer Targets

export type DeferTarget = "today" | "tomorrow" | "next_week" | "someday";

export const DeferTargetDisplay: Record<DeferTarget, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  next_week: "Next Week",
  someday: "Someday",
};

// MARK: - Search Scopes

export type SearchScope = "all" | "today" | "inbox" | "archive";

export const SearchScopeDisplay: Record<SearchScope, string> = {
  all: "All Tasks",
  today: "Today",
  inbox: "Inbox",
  archive: "Archive",
};

// MARK: - Quick Add Params

export interface QuickAddParams {
  /** Natural language input */
  text: string;
}

// MARK: - Reschedule Params

export interface RescheduleParams {
  date: string; // ISO date
  time?: string; // HH:mm format
}
