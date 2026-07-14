import { calculateLeaveTime, calculateRemainingTime } from "./time-utils";

type Remaining = {
  hours: number;
  minutes: number;
  isPast: boolean;
};

export type LeaveStatus = {
  leaveTime: string;
  remaining: Remaining;
};

export function buildLeaveStatus(
  startTime: string,
  workHours: number,
  breakMinutes: number,
  currentTime?: string,
): LeaveStatus {
  const leaveTime = calculateLeaveTime(startTime, workHours, breakMinutes);
  const remaining = calculateRemainingTime(leaveTime, startTime, currentTime);
  return { leaveTime, remaining };
}

export function formatRemainingLabel(remaining: Remaining): string {
  return remaining.isPast
    ? `${remaining.hours}h ${remaining.minutes}m overtime`
    : `${remaining.hours}h ${remaining.minutes}m left`;
}

export function formatTopSubtitle(status: LeaveStatus): string {
  return `${status.leaveTime} leave - ${formatRemainingLabel(status.remaining)}`;
}
