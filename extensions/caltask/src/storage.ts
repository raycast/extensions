import { LocalStorage } from "@raycast/api";
import { Task, TimerState } from "./types";

const STORAGE_KEY = "task-timer-state";

// Cleanup configuration
const MAX_UNEXPORTED_TASKS = 50; // Maximum number of unexported tasks to keep
const EXPORTED_RETENTION_DAYS = 7; // Days to keep exported tasks before auto-deletion

export async function getTimerState(): Promise<TimerState> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (parsed && typeof parsed === "object") {
        return {
          currentTask: parsed.currentTask ?? null,
          completedTasks: Array.isArray(parsed.completedTasks) ? parsed.completedTasks : [],
        };
      }
    } catch (error) {
      console.error("Failed to parse timer state, resetting storage:", error);
      // Clear corrupted data
      await LocalStorage.removeItem(STORAGE_KEY);
    }
  }
  return { currentTask: null, completedTasks: [] };
}

export async function saveTimerState(state: TimerState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Automatically cleanup old tasks:
 * 1. Delete exported tasks older than 7 days
 * 2. Keep only the latest 50 unexported tasks
 */
export async function cleanupTasks(): Promise<number> {
  const state = await getTimerState();
  const now = Date.now();
  const retentionMs = EXPORTED_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const originalCount = state.completedTasks.length;

  // Separate exported and unexported tasks
  const exportedTasks: Task[] = [];
  const unexportedTasks: Task[] = [];

  for (const task of state.completedTasks) {
    if (task.exportedToCalendar) {
      exportedTasks.push(task);
    } else {
      unexportedTasks.push(task);
    }
  }

  // 1. Remove exported tasks older than retention period
  const filteredExported = exportedTasks.filter((task) => {
    const taskTime = new Date(task.endTime || task.startTime).getTime();
    return now - taskTime < retentionMs;
  });

  // 2. Limit unexported tasks count (keep the most recent ones)
  const filteredUnexported = unexportedTasks.slice(0, MAX_UNEXPORTED_TASKS);

  // Merge and sort by time (newest first)
  state.completedTasks = [...filteredExported, ...filteredUnexported].sort((a, b) => {
    const timeA = new Date(b.endTime || b.startTime).getTime();
    const timeB = new Date(a.endTime || a.startTime).getTime();
    return timeA - timeB;
  });

  await saveTimerState(state);

  const deletedCount = originalCount - state.completedTasks.length;
  return deletedCount;
}

export async function startTask(
  taskName: string,
  calendarId?: string,
  calendarName?: string,
  accountName?: string,
  notes?: string,
  url?: string,
): Promise<Task> {
  const state = await getTimerState();

  // NOTE: Caller is responsible for stopping any running task before calling this
  // This allows the caller to handle export logic properly

  const newTask: Task = {
    id: Date.now().toString(),
    name: taskName,
    calendarId: calendarId,
    calendarName: calendarName,
    accountName: accountName,
    notes: notes || undefined,
    url: url || undefined,
    startTime: new Date().toISOString(),
    isRunning: true,
  };

  state.currentTask = newTask;
  await saveTimerState(state);
  return newTask;
}

/**
 * Generate a unique key for task deduplication based on name and calendar.
 * Uses calendarId if available, falls back to calendarName for backwards compatibility.
 */
function getTaskKey(name: string, calendarId?: string, calendarName?: string): string {
  const normalizedName = name.trim().toLowerCase();
  // Prefer calendarId over calendarName for matching
  const calendarKey = calendarId || (calendarName || "").trim().toLowerCase();
  return `${normalizedName}::${calendarKey}`;
}

export async function stopCurrentTask(): Promise<Task | null> {
  const state = await getTimerState();

  if (!state.currentTask || !state.currentTask.isRunning) {
    return null;
  }

  const endTime = new Date();
  const startTime = new Date(state.currentTask.startTime);
  const duration = endTime.getTime() - startTime.getTime();

  const currentTaskKey = getTaskKey(
    state.currentTask.name,
    state.currentTask.calendarId,
    state.currentTask.calendarName,
  );

  // Remove existing task with same name + calendar (keep only the latest)
  state.completedTasks = state.completedTasks.filter(
    (t) => getTaskKey(t.name, t.calendarId, t.calendarName) !== currentTaskKey,
  );

  // Create new completed task
  const completedTask: Task = {
    ...state.currentTask,
    endTime: endTime.toISOString(),
    duration,
    isRunning: false,
  };

  state.completedTasks.unshift(completedTask);
  state.currentTask = null;
  await saveTimerState(state);

  return completedTask;
}

export async function getCurrentTask(): Promise<Task | null> {
  const state = await getTimerState();
  return state.currentTask;
}

export async function getCompletedTasks(): Promise<Task[]> {
  const state = await getTimerState();
  return state.completedTasks;
}

export async function deleteTask(taskId: string): Promise<void> {
  const state = await getTimerState();
  state.completedTasks = state.completedTasks.filter((t) => t.id !== taskId);
  await saveTimerState(state);
}

export async function markTaskExported(taskId: string): Promise<void> {
  const state = await getTimerState();
  const task = state.completedTasks.find((t) => t.id === taskId);
  if (task) {
    task.exportedToCalendar = true;
    await saveTimerState(state);
  }
}

/**
 * Update a task's calendar assignment.
 * Used to assign a calendar to a task that was created without one.
 */
export async function updateTaskCalendar(
  taskId: string,
  calendarId: string,
  calendarName: string,
  accountName?: string,
): Promise<Task | null> {
  const state = await getTimerState();
  const task = state.completedTasks.find((t) => t.id === taskId);
  if (task) {
    task.calendarId = calendarId;
    task.calendarName = calendarName;
    task.accountName = accountName;
    await saveTimerState(state);
    return task;
  }
  return null;
}

export interface TaskSuggestion {
  name: string;
  calendarId?: string;
  calendarName?: string;
  accountName?: string;
  notes?: string;
  url?: string;
  lastUsed: string; // ISO string
}

/**
 * Get unique task name suggestions from recent completed tasks.
 * Returns the most recent calendar for each unique task name.
 */
export async function getRecentTaskSuggestions(): Promise<TaskSuggestion[]> {
  const state = await getTimerState();
  const suggestionMap = new Map<string, TaskSuggestion>();

  // Completed tasks are already sorted by newest first
  for (const task of state.completedTasks) {
    const normalizedName = task.name.trim().toLowerCase();
    // Only keep the first occurrence (most recent) for each unique name
    if (!suggestionMap.has(normalizedName)) {
      suggestionMap.set(normalizedName, {
        name: task.name,
        calendarId: task.calendarId,
        calendarName: task.calendarName,
        accountName: task.accountName,
        notes: task.notes,
        url: task.url,
        lastUsed: task.endTime || task.startTime,
      });
    }
  }

  // Convert to array and sort by last used (newest first)
  return Array.from(suggestionMap.values()).sort((a, b) => {
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
}
