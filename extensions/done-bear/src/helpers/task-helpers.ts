import type { TaskRecord, TaskState, TaskView } from "../api/types";
import { todayDateOnlyEpoch, tomorrowDateOnlyEpoch } from "./date-codecs";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDayEpoch = (now: Date): number => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
};

const toEpoch = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

const hasDeadlineOnDay = (task: TaskRecord, dayStart: number, dayEnd: number): boolean => {
  const deadlineAt = toEpoch(task.deadlineAt);
  return deadlineAt !== null && deadlineAt >= dayStart && deadlineAt < dayEnd;
};

export const buildTaskStartFields = (
  view: TaskView,
  now = new Date(),
): {
  start: string;
  startBucket: string;
  startDate: number | null;
  todayIndexReferenceDate: number | null;
} => {
  const today = todayDateOnlyEpoch(now);
  const tomorrow = tomorrowDateOnlyEpoch(now);

  switch (view) {
    case "inbox": {
      return {
        start: "not_started",
        startBucket: "today",
        startDate: null,
        todayIndexReferenceDate: null,
      };
    }
    case "anytime": {
      return {
        start: "started",
        startBucket: "today",
        startDate: null,
        todayIndexReferenceDate: null,
      };
    }
    case "today": {
      return {
        start: "started",
        startBucket: "today",
        startDate: today,
        todayIndexReferenceDate: today,
      };
    }
    case "upcoming": {
      return {
        start: "started",
        startBucket: "upcoming",
        startDate: tomorrow,
        todayIndexReferenceDate: null,
      };
    }
    case "someday": {
      return {
        start: "someday",
        startBucket: "today",
        startDate: null,
        todayIndexReferenceDate: null,
      };
    }
    default: {
      return {
        start: "not_started",
        startBucket: "today",
        startDate: null,
        todayIndexReferenceDate: null,
      };
    }
  }
};

export const getTaskState = (task: TaskRecord): TaskState => {
  if (task.archivedAt !== null) {
    return "archived";
  }
  if (task.completedAt !== null) {
    return "done";
  }
  return "open";
};

/**
 * Determine which view a task belongs to.
 * Matches the frontend logic in manage-frontend/lib/tasks/task-status.ts
 */
const getTaskView = (task: TaskRecord, now = new Date()): TaskView | null => {
  // Repeat templates are hidden from normal views (they generate instances)
  if (task.repeatRule !== null && task.repeatTemplateId === null) {
    return null;
  }

  if (task.archivedAt !== null) {
    return null;
  }
  if (task.completedAt !== null) {
    return "logbook";
  }

  const { start } = task;
  const startDate = toEpoch(task.startDate);

  const todayStart = startOfDayEpoch(now);
  const tomorrow = todayStart + DAY_MS;

  const deadlineToday = hasDeadlineOnDay(task, todayStart, tomorrow);

  if (start === "not_started") {
    return deadlineToday ? "today" : "inbox";
  }

  if (start === "someday") {
    return deadlineToday ? "today" : "someday";
  }

  if (start !== "started") {
    return null;
  }

  // Anytime: no scheduled date
  if (startDate === null) {
    return deadlineToday ? "today" : "anytime";
  }

  // Tasks with today's (or past) start date appear in Today (Things 3 pattern)
  if (startDate < tomorrow || deadlineToday) {
    return "today";
  }

  return "upcoming";
};

export const matchesView = (task: TaskRecord, view: TaskView): boolean => getTaskView(task) === view;

export const formatDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) {
    return "";
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const isOverdue = (task: TaskRecord): boolean => {
  if (!task.deadlineAt || task.completedAt || task.archivedAt) {
    return false;
  }
  return new Date(task.deadlineAt) < new Date();
};
