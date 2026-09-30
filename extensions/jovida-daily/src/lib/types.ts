// Types mirror the real JSON the `jovida` CLI emits (verified against jovida-cli).
// The CLI uses snake_case keys and ISO-8601 strings for times.

export type Priority = "none" | "low" | "medium" | "high";
export type TodoStatus = "pending" | "completed";
export type ReminderChannel =
  | "notification"
  | "alarm"
  | "voice_call"
  | "follow_up";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  entry_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: Priority;
  // ISO-8601. A bare date means "belongs to that day"; a datetime means a deadline.
  when?: string;
  status: TodoStatus;
  subtasks?: Subtask[];
  // Absolute ISO-8601 times to nudge the user; each is at/before `when`.
  remind_at?: string[];
  // Raw proto channel names; includes TODO_REMINDER_CHANNEL_VOICE_CALL for phone reminders.
  reminder_channels?: string[];
  // Present when this todo is an occurrence of a repeating todo.
  recurring_id?: string | null;
  hint?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ListResult {
  todos: Todo[];
  total: number;
  has_more: boolean;
}

export type ListScope = "today" | "upcoming" | "recent" | "range" | "all";

export interface ListOptions {
  scope?: ListScope;
  status?: TodoStatus | "all";
  query?: string;
  category?: string;
  priority?: Priority;
  from?: string; // YYYY-MM-DD (with scope=range)
  to?: string; // YYYY-MM-DD (with scope=range)
  limit?: number;
  full?: boolean;
}

export interface CreateInput {
  title: string;
  when?: string;
  priority?: Priority;
  category?: string;
  description?: string;
  subtasks?: string[];
  reminders?: string[];
  reminderChannels?: ReminderChannel[];
  phoneReminder?: boolean;
  hint?: string;
  // Repeat rule (turns it into a repeating todo; needs `when` as the first date).
  repeat?: "day" | "week" | "month" | "year";
  every?: number;
  weekdays?: string; // e.g. "mon,wed,fri" or "1,3,5"
  dayOfMonth?: number;
  monthOfYear?: number;
  until?: string; // YYYY-MM-DD
}

export interface UpdateInput {
  title?: string;
  when?: string;
  priority?: Priority;
  category?: string;
  description?: string;
  subtasks?: string[];
  reminders?: string[];
  reminderChannels?: ReminderChannel[];
  phoneReminder?: boolean;
  hint?: string;
  repeat?: "day" | "week" | "month" | "year";
  every?: number;
  weekdays?: string;
  dayOfMonth?: number;
  monthOfYear?: number;
  until?: string;
  // Clear flags — unset a field entirely.
  clearWhen?: boolean;
  clearRemind?: boolean;
  clearCategory?: boolean;
  clearDesc?: boolean;
  clearSubtasks?: boolean;
  clearHint?: boolean;
  clearUntil?: boolean;
}

export interface WhoAmI {
  userId: string;
  jovidaId?: string;
  baseUrl?: string;
}

// Error shape the CLI prints to stderr: {"error":{"code","message"}}
export type JovidaErrorCode =
  | "NOT_SIGNED_IN"
  | "NETWORK"
  | "SERVER_ERROR"
  | "NOT_FOUND"
  | "USAGE"
  | "UNKNOWN";

export class JovidaError extends Error {
  code: JovidaErrorCode;
  exitCode: number;
  constructor(code: JovidaErrorCode, message: string, exitCode: number) {
    super(message);
    this.name = "JovidaError";
    this.code = code;
    this.exitCode = exitCode;
  }
}
