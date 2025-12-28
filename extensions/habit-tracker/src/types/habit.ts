export type Frequency = "daily" | number[]; // "daily" or array of days (0=Sunday, 6=Saturday)

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: Frequency;
  created_at: string; // ISO String
  is_paused: boolean;
  archived: boolean;
  color?: string;
  icon?: string;
}

export type HabitStatus = "completed" | "skipped";

export interface DayLog {
  habit_id: string;
  date: string; // YYYY-MM-DD
  status: HabitStatus;
  timestamp: number; // For ordering if needed, or conflict resolution
}

export interface Streak {
  current: number;
  longest: number;
  last_completed_date: string | null;
}

export interface HabitStats extends Streak {
  total_completions: number;
  completion_rate_30d: number;
}
