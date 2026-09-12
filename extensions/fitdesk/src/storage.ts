import { LocalStorage } from "@raycast/api";

export interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  category: string;
  completedAt: string; // ISO date string
  duration?: number; // seconds for time-based exercises
  reps?: number; // for rep-based exercises
}

export interface ReminderSettings {
  enabled: boolean;
  intervalMinutes: number;
  lastReminder?: string; // ISO date string
}

const HISTORY_KEY = "exercise_history";
const REMINDER_SETTINGS_KEY = "reminder_settings";

// Exercise History
export async function getExerciseHistory(): Promise<CompletedExercise[]> {
  const data = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addExerciseToHistory(
  exercise: CompletedExercise,
): Promise<void> {
  const history = await getExerciseHistory();
  history.unshift(exercise); // Add to beginning
  // Keep only last 500 exercises
  const trimmedHistory = history.slice(0, 500);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

// Statistics helpers
export function getExercisesToday(
  history: CompletedExercise[],
): CompletedExercise[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return history.filter((e) => new Date(e.completedAt) >= today);
}

export function getExercisesThisWeek(
  history: CompletedExercise[],
): CompletedExercise[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  return history.filter((e) => new Date(e.completedAt) >= startOfWeek);
}

export function getExercisesThisMonth(
  history: CompletedExercise[],
): CompletedExercise[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return history.filter((e) => new Date(e.completedAt) >= startOfMonth);
}

export function getExercisesByDay(
  history: CompletedExercise[],
): Map<string, CompletedExercise[]> {
  const byDay = new Map<string, CompletedExercise[]>();
  for (const exercise of history) {
    const date = new Date(exercise.completedAt).toLocaleDateString();
    const existing = byDay.get(date) || [];
    existing.push(exercise);
    byDay.set(date, existing);
  }
  return byDay;
}

export function getStreak(history: CompletedExercise[]): number {
  if (history.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = getExercisesByDay(history);
  let streak = 0;
  const currentDate = new Date(today);

  // Check if there's an exercise today
  const todayStr = today.toLocaleDateString();
  if (!byDay.has(todayStr)) {
    // Check yesterday - streak might still be valid
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count consecutive days (max 365 to avoid infinite loop)
  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toLocaleDateString();
    if (byDay.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Reminder Settings
export async function getReminderSettings(): Promise<ReminderSettings> {
  const data = await LocalStorage.getItem<string>(REMINDER_SETTINGS_KEY);
  if (!data) {
    return { enabled: false, intervalMinutes: 45 };
  }
  try {
    return JSON.parse(data);
  } catch {
    return { enabled: false, intervalMinutes: 45 };
  }
}

export async function saveReminderSettings(
  settings: ReminderSettings,
): Promise<void> {
  await LocalStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
}

export async function updateLastReminder(): Promise<void> {
  const settings = await getReminderSettings();
  settings.lastReminder = new Date().toISOString();
  await saveReminderSettings(settings);
}
