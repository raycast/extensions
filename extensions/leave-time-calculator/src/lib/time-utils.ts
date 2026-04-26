function parseTime(timeStr: string): Date {
  const parts = timeStr.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function getReferenceNow(currentTime?: string): Date {
  const now = new Date();

  // Prefer UI-displayed time when provided so remaining time matches what users see.
  if (currentTime) {
    const parts = currentTime.split(":").map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      now.setHours(hours, minutes, 0, 0);
      return now;
    }
  }

  // Round down to minute precision to avoid showing one minute less due to seconds.
  now.setSeconds(0, 0);
  return now;
}

export function formatTime(date: Date): string {
  return formatTimeString(date.getHours(), date.getMinutes());
}

export function getCurrentTime(): string {
  return formatTime(new Date());
}

export function calculateLeaveTime(
  startTime: string,
  workHours: number,
  breakMinutes: number,
): string {
  const start = parseTime(startTime);
  const totalMinutes = workHours * 60 + breakMinutes;
  const leave = new Date(start.getTime() + totalMinutes * 60000);
  return formatTime(leave);
}

export function calculateRemainingTime(
  leaveTime: string,
  startTime: string | null,
  currentTime?: string,
): { hours: number; minutes: number; isPast: boolean } {
  const now = getReferenceNow(currentTime);
  let leave = parseTime(leaveTime);

  // If start time is provided and leave time < start time, treat as overnight shift
  if (startTime) {
    const start = parseTime(startTime);
    if (leave < start) {
      // Example: start=22:00, leave=06:00 represents a 22:00 to next day 06:00 shift.
      // The leave time needs to represent 06:00 of the next calendar day.
      //
      // Whether to add +24 hours depends on which side of midnight we're currently on:
      // - now >= start:
      //     Still on the start day (e.g., 23:00).
      //     Leave is next day's 06:00, so add +24 hours to leave.
      // - now < start:
      //     Already past midnight in the early morning (e.g., 01:00).
      //     06:00 refers to today's calendar date, so no +24 hours needed.
      if (now >= start) {
        // Still on start day -> leave is tomorrow on the calendar
        leave = new Date(leave.getTime() + 24 * 60 * 60 * 1000);
      }
      // If now < start:
      //   We're in the "overnight shift from yesterday" but already on
      //   the leave day's calendar date, so leave time is used as-is.
    }
  }

  const diffMs = leave.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, isPast };
}

/** Generate HH:MM format time string */
export function formatTimeString(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
