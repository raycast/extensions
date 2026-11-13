export type Session = {
  start: number;
  goal: string;
  duration: number;
  source: "timestamps" | "reported" | "manual";
  planned?: number;
  pauses?: number;
  blocks?: number;
  sites?: Record<string, number>;
  notes?: string;
};

export type PendingStart = { at: number; goal: string; planned?: number };

export type LoggedBlocks = {
  mode: "block" | "allow";
  apps: string[];
  websites: string[];
};

export type FocusEvent =
  | { type: "start"; at: number; goal: string; plannedSeconds: number | null; blocked?: LoggedBlocks }
  | { type: "update"; at: number; goal: string; plannedSeconds: number | null }
  | {
      type: "summary";
      at: number;
      startedAt: number | null;
      reportedSeconds: number | null;
      pauses: number;
      blocks: number;
    }
  | { type: "end"; at: number; completed: boolean }
  | { type: "pause"; at: number; seconds: number | null }
  | { type: "blocked"; at: number; site: string };

export type DayCell = {
  date: string;
  minutes: number;
  sessions: number;
  level: 0 | 1 | 2 | 3 | 4;
  shielded: boolean;
};

export type GoalTotal = {
  name: string;
  minutes: number;
  sessions: number;
};

export type Stats = {
  totalMinutes: number;
  totalSessions: number;
  firstSessionAt: number | null;
  todayMinutes: number;
  weekMinutes: number;
  lastWeekMinutes: number;
  currentStreak: number;
  shieldsLeft: number;
  bestStreak: number;
  bestStreakEnd: number | null;
  bestStreakStart: number | null;
  goals: GoalTotal[];
  days: DayCell[];
  activeDays: number;
  longestSession: Session | null;
  bestDay: { date: string; minutes: number } | null;
};

export type Appearance = "light" | "dark";
