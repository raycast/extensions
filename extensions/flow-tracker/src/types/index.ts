// types/index.ts
import { Icon } from "@raycast/api";

export interface Session {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  date: string;
}

export interface DailyLog {
  date: string;
  time: number;
  sessions: Session[];
  activities: string[];
}

export interface FocusLog {
  totalTime: number;
  lastStart: number | null;
  dailyLogs: DailyLog[];
  personalBest?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: Icon;
  condition: (focusLog: FocusLog) => boolean;
}

export interface FlowContextType {
  isTracking: boolean;
  totalTime: number;
  personalBest: number | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  resetLogs: () => Promise<void>;
}
