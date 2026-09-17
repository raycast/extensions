import {
  calculateLeaveDate,
  calculateRemainingTime,
  formatTime,
} from "./time-utils";

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
  startDate?: string,
): LeaveStatus {
  const leaveDate = calculateLeaveDate(
    startTime,
    workHours,
    breakMinutes,
    startDate,
  );
  const leaveTime = formatTime(leaveDate);
  const remaining = calculateRemainingTime(
    leaveTime,
    startTime,
    currentTime,
    startDate,
    leaveDate,
  );
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
