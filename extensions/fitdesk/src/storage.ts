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

// Demo data for screenshots
export async function loadDemoData(): Promise<void> {
  const demoExercises: CompletedExercise[] = [];
  const now = new Date();

  // Exercise templates
  const exerciseTemplates = [
    { id: "pushups", name: "Push-ups", category: "upper", reps: 15 },
    { id: "squats", name: "Squats", category: "lower", reps: 20 },
    { id: "plank", name: "Plank", category: "core", duration: 45 },
    { id: "jumping-jacks", name: "Jumping Jacks", category: "cardio", duration: 45 },
    { id: "burpees", name: "Burpees", category: "full-body", reps: 8 },
    { id: "lunges", name: "Lunges", category: "lower", reps: 12 },
    { id: "crunches", name: "Crunches", category: "core", reps: 20 },
    { id: "tricep-dips", name: "Tricep Dips", category: "upper", reps: 12 },
    { id: "high-knees", name: "High Knees", category: "cardio", duration: 30 },
    { id: "mountain-climbers", name: "Mountain Climbers", category: "core", duration: 30 },
  ];

  const addExercise = (daysAgo: number, hoursAgo: number, templateIndex: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(now.getHours() - hoursAgo, Math.floor(Math.random() * 60), 0, 0);
    const template = exerciseTemplates[templateIndex % exerciseTemplates.length];
    demoExercises.push({
      exerciseId: template.id,
      exerciseName: template.name,
      category: template.category,
      completedAt: date.toISOString(),
      ...(template.duration ? { duration: template.duration } : { reps: template.reps }),
    });
  };

  // Today: 5 exercises
  addExercise(0, 1, 0);
  addExercise(0, 2, 1);
  addExercise(0, 4, 2);
  addExercise(0, 6, 3);
  addExercise(0, 8, 4);

  // This week (not today): 7 more = 12 total
  addExercise(1, 2, 5);
  addExercise(1, 5, 6);
  addExercise(2, 3, 7);
  addExercise(2, 6, 8);
  addExercise(3, 2, 9);
  addExercise(4, 4, 0);
  addExercise(5, 3, 1);

  // This month (not this week): 20 more = 32 total
  for (let i = 0; i < 20; i++) {
    const daysAgo = 7 + Math.floor(i / 3);
    addExercise(daysAgo, i % 8 + 1, i);
  }

  // Older (not this month): 18 more = 50 total
  for (let i = 0; i < 18; i++) {
    const daysAgo = 35 + Math.floor(i / 2);
    addExercise(daysAgo, i % 6 + 1, i);
  }

  // Sort by date descending
  demoExercises.sort((a, b) =>
    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(demoExercises));
}
