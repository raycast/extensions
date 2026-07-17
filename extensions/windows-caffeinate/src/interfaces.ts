export interface Schedule {
  day: string;
  from: string;
  to: string;
  IsManuallyDecafed: boolean;
  IsRunning: boolean;
}

export interface ParsedSchedule {
  days: string[];
  from: string;
  to: string;
}

export interface CaffeinationInfo {
  running: boolean;
  totalSeconds: number | null;
  elapsedSeconds: number | null;
  watchPid: number | null;
}
