import { differenceInCalendarDays } from "date-fns";
import { compareCanonicalDateStrings, fromCanonicalDateString } from "./date";
import type { TaskIndicatorKind, TaskVisualTone } from "./task-visuals";
import type { TaskInput, TaskRecord, TaskStatus, TaskViewFilter, TaskWorkLogInput } from "./types";
import { matchesTaskSearch } from "./task-presentation";

export interface EnabledListMetadata {
  dueDate: boolean;
  pastDue: boolean;
  startDate: boolean;
}

export interface TaskListIndicator {
  kind: TaskIndicatorKind;
  priority: number;
  text: string;
  tone: TaskVisualTone;
  tooltip: string;
}

interface TaskSearchOptions {
  includeWorkLogs?: boolean;
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  archived: "Archived",
};

const TASK_FILTER_LABELS: Record<TaskViewFilter, string> = {
  all: "All Tasks",
  open: "Open Tasks",
  todo: "To Do",
  in_progress: "In Progress",
  due_soon: "Due Soon",
  done: "Done",
  archived: "Archived",
};

const TASK_FILTER_DESCRIPTIONS: Record<TaskViewFilter, string> = {
  all: "Includes to-do, in-progress, and done tasks. Archived tasks stay in their own view.",
  open: "Shows tasks with To Do or In Progress status.",
  todo: "Shows only tasks with To Do status.",
  in_progress: "Shows only tasks with In Progress status.",
  due_soon: "Shows to-do and in-progress tasks due within the configured Due Soon window.",
  done: "Shows only completed tasks.",
  archived: "Shows only archived tasks.",
};

// Raycast applies the manifest default for command preferences at runtime.
// Pure task utilities also run in tests and non-UI paths, so they keep the same
// fallback here for callers that do not read preferences first.
export const DEFAULT_DUE_SOON_DAYS = 2;
// Start dates should always occupy the leftmost slot in the list metadata stack.
const START_INDICATOR_PRIORITY = -1;

const OPEN_STATUS_PRIORITY: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  archived: 3,
};

export function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status];
}

export function getTaskFilterLabel(filter: TaskViewFilter): string {
  return TASK_FILTER_LABELS[filter];
}

export function getTaskFilterDescription(filter: TaskViewFilter): string {
  return TASK_FILTER_DESCRIPTIONS[filter];
}

export function isTaskViewFilter(value: unknown): value is TaskViewFilter {
  return (
    value === "all" ||
    value === "open" ||
    value === "todo" ||
    value === "in_progress" ||
    value === "due_soon" ||
    value === "done" ||
    value === "archived"
  );
}

export function sortTasks(tasks: TaskRecord[], dueSoonDays = DEFAULT_DUE_SOON_DAYS): TaskRecord[] {
  return [...tasks].sort((left, right) => compareTasks(left, right, dueSoonDays));
}

export function filterTasks(
  tasks: TaskRecord[],
  filter: TaskViewFilter,
  searchText: string,
  dueSoonDays = DEFAULT_DUE_SOON_DAYS,
  options?: TaskSearchOptions,
): TaskRecord[] {
  const normalizedSearch = searchText.trim().toLowerCase();

  return sortTasks(tasks, dueSoonDays).filter((task) => {
    if (!matchesTaskFilter(task, filter, dueSoonDays)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return matchesTaskSearchWithOptions(task, normalizedSearch, options);
  });
}

export function matchesTaskFilter(
  task: TaskRecord,
  filter: TaskViewFilter,
  dueSoonDays = DEFAULT_DUE_SOON_DAYS,
): boolean {
  switch (filter) {
    case "all":
      return task.status !== "archived";
    case "open":
      return task.status === "todo" || task.status === "in_progress";
    case "todo":
      return task.status === "todo";
    case "in_progress":
      return task.status === "in_progress";
    case "due_soon":
      return isDueSoon(task, dueSoonDays);
    case "done":
      return task.status === "done";
    case "archived":
      return task.status === "archived";
  }
}

export function validateTaskInput(input: TaskInput): string | undefined {
  const header = input.header?.trim();
  if (!header) {
    return "Header is required";
  }

  const startDate = parseTaskDate(input.startDate);
  const dueDate = parseTaskDate(input.dueDate);

  if (startDate && dueDate && startDate.getTime() > dueDate.getTime()) {
    return "Start Date cannot be after Due Date";
  }

  return undefined;
}

export function validateWorkLogInput(input: TaskWorkLogInput): string | undefined {
  const body = input.body?.trim();
  if (!body) {
    return "Work log entry is required";
  }

  return undefined;
}

export function isActiveTaskStatus(status: TaskStatus): boolean {
  return status === "todo" || status === "in_progress";
}

export function getRelativeDueLabel(value?: string | null): string | null {
  const dueDate = parseTaskDate(value);
  if (!dueDate) {
    return null;
  }

  const daysUntilDue = differenceInCalendarDays(dueDate, startOfToday());
  if (daysUntilDue < 0) {
    return `Overdue ${Math.abs(daysUntilDue)}d`;
  }

  if (daysUntilDue === 0) {
    return "Due Today";
  }

  if (daysUntilDue === 1) {
    return "Due Tomorrow";
  }

  return `Due in ${daysUntilDue}d`;
}

export function getRelativeDueTone(value?: string | null, dueSoonDays = DEFAULT_DUE_SOON_DAYS): TaskVisualTone | null {
  const dueDate = parseTaskDate(value);
  if (!dueDate) {
    return null;
  }

  const daysUntilDue = differenceInCalendarDays(dueDate, startOfToday());
  return getDueIndicatorTone(daysUntilDue, dueSoonDays);
}

export function getTaskListIndicators(
  task: TaskRecord,
  enabledMetadata: EnabledListMetadata,
  dueSoonDays = DEFAULT_DUE_SOON_DAYS,
): TaskListIndicator[] {
  const indicators: TaskListIndicator[] = [];
  let isShowingDueIndicator = false;

  if (enabledMetadata.dueDate) {
    const dueIndicator = getDueDateIndicator(task.dueDate, dueSoonDays);
    if (dueIndicator !== null && (enabledMetadata.pastDue || dueIndicator.tone !== "critical")) {
      indicators.push(dueIndicator);
      isShowingDueIndicator = true;
    }
  }

  if (enabledMetadata.startDate) {
    const startIndicator = getStartDateIndicator(task.startDate, isShowingDueIndicator ? task.dueDate : null);
    if (startIndicator !== null) {
      indicators.push(startIndicator);
    }
  }

  return indicators.sort((left, right) => left.priority - right.priority);
}

export function getMenuBarTask(tasks: TaskRecord[]): TaskRecord | undefined {
  return getMenuBarTasks(tasks, 1)[0];
}

export function getMenuBarTasks(tasks: TaskRecord[], limit = 5): TaskRecord[] {
  const visibleTasks = tasks.filter((task) => isActiveTaskStatus(task.status));
  if (visibleTasks.length === 0 || limit <= 0) {
    return [];
  }

  if (!visibleTasks.some((task) => task.dueDate !== null)) {
    return sortTasks(visibleTasks).slice(0, limit);
  }

  return [...visibleTasks]
    .sort((left, right) => {
      if (left.dueDate && right.dueDate) {
        const dueDateComparison = compareCanonicalDateStrings(left.dueDate, right.dueDate);
        if (dueDateComparison !== 0) {
          return dueDateComparison;
        }
      } else if (left.dueDate) {
        return -1;
      } else if (right.dueDate) {
        return 1;
      }

      return compareTasks(left, right, DEFAULT_DUE_SOON_DAYS);
    })
    .slice(0, limit);
}

function compareTasks(left: TaskRecord, right: TaskRecord, dueSoonDays: number): number {
  if (left.status !== right.status) {
    return OPEN_STATUS_PRIORITY[left.status] - OPEN_STATUS_PRIORITY[right.status];
  }

  if (isActiveTaskStatus(left.status)) {
    const urgencyComparison = compareOpenTaskUrgency(left, right, dueSoonDays);
    if (urgencyComparison !== 0) {
      return urgencyComparison;
    }
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function matchesTaskSearchWithOptions(
  task: TaskRecord,
  normalizedSearch: string,
  options?: TaskSearchOptions,
): boolean {
  return matchesTaskSearch(task, normalizedSearch, options?.includeWorkLogs ?? false);
}

function compareOpenTaskUrgency(left: TaskRecord, right: TaskRecord, dueSoonDays: number): number {
  const leftBucket = getUrgencyBucket(left, dueSoonDays);
  const rightBucket = getUrgencyBucket(right, dueSoonDays);

  if (leftBucket !== rightBucket) {
    return leftBucket - rightBucket;
  }

  if (left.dueDate && right.dueDate) {
    return compareCanonicalDateStrings(left.dueDate, right.dueDate);
  }

  return 0;
}

function getUrgencyBucket(task: TaskRecord, dueSoonDays: number): number {
  const dueDate = parseTaskDate(task.dueDate);
  if (!dueDate) {
    return 3;
  }

  const daysUntilDue = differenceInCalendarDays(dueDate, startOfToday());
  if (daysUntilDue < 0) {
    return 0;
  }

  if (daysUntilDue <= dueSoonDays) {
    return 1;
  }

  return 2;
}

function isDueSoon(task: TaskRecord, dueSoonDays: number): boolean {
  if (!isActiveTaskStatus(task.status)) {
    return false;
  }

  const dueDate = parseTaskDate(task.dueDate);
  if (!dueDate) {
    return false;
  }

  return differenceInCalendarDays(dueDate, startOfToday()) <= dueSoonDays;
}

function getDueDateIndicator(value: string | null | undefined, dueSoonDays: number): TaskListIndicator | null {
  const dueDate = parseTaskDate(value);
  if (!dueDate) {
    return null;
  }

  const daysUntilDue = differenceInCalendarDays(dueDate, startOfToday());
  return {
    kind: "due",
    priority: getDueIndicatorPriority(daysUntilDue),
    text: formatRelativeIndicator(daysUntilDue, dueDate),
    tone: getDueIndicatorTone(daysUntilDue, dueSoonDays),
    tooltip: buildCountdownTooltip("Due", daysUntilDue, dueDate),
  };
}

function getStartDateIndicator(
  value: string | null | undefined,
  dueDateValue?: string | null,
): TaskListIndicator | null {
  const startDate = parseTaskDate(value);
  if (!startDate) {
    return null;
  }

  const dueDate = parseTaskDate(dueDateValue);
  if (dueDate && differenceInCalendarDays(startDate, dueDate) === 0) {
    return null;
  }

  const daysUntilStart = differenceInCalendarDays(startDate, startOfToday());
  if (daysUntilStart < 0) {
    return null;
  }

  return {
    kind: "start",
    priority: START_INDICATOR_PRIORITY,
    text: formatRelativeIndicator(daysUntilStart, startDate),
    tone: "info",
    tooltip: buildCountdownTooltip("Start", daysUntilStart, startDate),
  };
}

function formatRelativeIndicator(days: number, date: Date): string {
  if (days < 0) {
    return `${Math.abs(days)}d late`;
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  if (days <= 7) {
    return `${days}d`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getDueIndicatorTone(daysUntilDue: number, dueSoonDays: number): TaskVisualTone {
  if (daysUntilDue < 0) {
    return "critical";
  }

  if (daysUntilDue <= dueSoonDays) {
    return "warning";
  }

  return "scheduled";
}

function getDueIndicatorPriority(daysUntilDue: number): number {
  if (daysUntilDue < 0) {
    return 0;
  }

  if (daysUntilDue <= 7) {
    return 1;
  }

  return 3;
}

function buildCountdownTooltip(label: string, days: number, date: Date): string {
  const formattedDate = date.toLocaleDateString();
  if (days < 0) {
    return `${label} ${Math.abs(days)}d ago (${formattedDate})`;
  }

  if (days === 0) {
    return `${label} today (${formattedDate})`;
  }

  return `${label} in ${days}d (${formattedDate})`;
}

function parseTaskDate(value?: string | null): Date | null {
  return fromCanonicalDateString(value);
}

function startOfToday(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}
