import type { Color } from "@raycast/api";

export interface Timer {
  id: string;
  name: string;
  color: Color;
  totalSeconds: number;
  isRunning: boolean;
  logs: TimerLog[];
  startTime?: number;
}

export interface TimerLog {
  startTime: string;
  endTime: string;
  duration: number;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours === 0) {
    return minutes === 0 ? `${remainingSeconds}s` : `${minutes}m ${remainingSeconds}s`;
  }
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}
