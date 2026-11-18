import type { Schedule } from "./interfaces";

export type UserStopDecision = { allowed: true; pauseRunningSchedule: boolean } | { allowed: false };

export function getUserStopDecision(schedule: Schedule | undefined, pauseRunningSchedules: boolean): UserStopDecision {
  if (!schedule?.IsRunning) return { allowed: true, pauseRunningSchedule: false };
  return pauseRunningSchedules ? { allowed: true, pauseRunningSchedule: true } : { allowed: false };
}
