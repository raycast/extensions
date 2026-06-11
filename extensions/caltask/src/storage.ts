import { LocalStorage } from "@raycast/api";
import { Task, TimerState, CalendarEvent } from "./types";

const STORAGE_KEY = "task-timer-state";

async function getTimerState(): Promise<TimerState> {
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

async function saveTimerState(state: TimerState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function startTask(
  taskName: string,
  calendarId?: string,
  calendarName?: string,
  accountName?: string,
  notes?: string,
  url?: string,
  sourceCalendarEventId?: string,
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
    sourceCalendarEventId: sourceCalendarEventId || undefined,
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
 * Get unique task name suggestions from local tasks and calendar events.
 * Merges both sources, deduplicates by normalized name, keeps most recent.
 */
export async function getRecentTaskSuggestions(calendarEvents?: CalendarEvent[]): Promise<TaskSuggestion[]> {
  const state = await getTimerState();
  const suggestionMap = new Map<string, TaskSuggestion>();

  // Local completed tasks (newest first)
  for (const task of state.completedTasks) {
    const normalizedName = task.name.trim().toLowerCase();
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

  // Calendar events
  if (calendarEvents) {
    for (const event of calendarEvents) {
      const normalizedName = event.title.trim().toLowerCase();
      const eventTime = event.endDate || event.startDate;
      const existing = suggestionMap.get(normalizedName);
      // Only add if not already present, or if this event is more recent
      if (!existing || new Date(eventTime).getTime() > new Date(existing.lastUsed).getTime()) {
        suggestionMap.set(normalizedName, {
          name: event.title,
          calendarId: event.calendarId,
          calendarName: event.calendarName,
          accountName: event.accountName,
          notes: existing?.notes,
          url: existing?.url,
          lastUsed: eventTime,
        });
      }
    }
  }

  return Array.from(suggestionMap.values()).sort((a, b) => {
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
}
