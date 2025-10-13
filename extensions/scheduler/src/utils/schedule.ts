import { ScheduledCommand } from "../types";
import { isWithinExecutionWindow, convertScheduleDayToJSDay } from "./dateTime";
import { CronExpressionParser } from "cron-parser";

// Helper function to get the last execution time from the command itself
function getLastExecutionTime(command: ScheduledCommand): Date | null {
  return command.lastExecutedAt ? new Date(command.lastExecutedAt) : null;
}

/**
 * Get the next scheduled time after a given reference time.
 * Returns null if there's no next scheduled time (e.g., for expired "once" schedules).
 */
function getNextScheduledTime(command: ScheduledCommand, afterTime: Date): Date | null {
  const { schedule } = command;

  switch (schedule.type) {
    case "once": {
      if (!schedule.date || !schedule.time) return null;
      const scheduledDateTime = new Date(`${schedule.date}T${schedule.time}`);
      return scheduledDateTime > afterTime ? scheduledDateTime : null;
    }

    case "15mins": {
      const lastExecution = getLastExecutionTime(command);
      if (!lastExecution) return afterTime; // Never executed, due now
      const nextTime = new Date(lastExecution.getTime() + 15 * 60 * 1000);
      return nextTime > afterTime ? nextTime : afterTime;
    }

    case "30mins": {
      const lastExecution = getLastExecutionTime(command);
      if (!lastExecution) return afterTime; // Never executed, due now
      const nextTime = new Date(lastExecution.getTime() + 30 * 60 * 1000);
      return nextTime > afterTime ? nextTime : afterTime;
    }

    case "hourly": {
      const lastExecution = getLastExecutionTime(command);
      if (!lastExecution) return afterTime; // Never executed, due now
      const nextTime = new Date(lastExecution.getTime() + 60 * 60 * 1000);
      return nextTime > afterTime ? nextTime : afterTime;
    }

    case "daily": {
      if (!schedule.time) return null;
      const [hours, minutes] = schedule.time.split(":").map(Number);
      const nextTime = new Date(afterTime);
      nextTime.setHours(hours, minutes, 0, 0);

      // If the time today has passed, move to tomorrow
      if (nextTime <= afterTime) {
        nextTime.setDate(nextTime.getDate() + 1);
      }
      return nextTime;
    }

    case "weekly": {
      if (schedule.dayOfWeek === undefined || !schedule.time) return null;
      const targetDay = convertScheduleDayToJSDay(schedule.dayOfWeek);
      const [hours, minutes] = schedule.time.split(":").map(Number);

      const nextTime = new Date(afterTime);
      nextTime.setHours(hours, minutes, 0, 0);

      // Calculate days until next occurrence
      const currentDay = nextTime.getDay();
      let daysUntilTarget = targetDay - currentDay;

      // If target day is today but time has passed, or target is in the past this week
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextTime <= afterTime)) {
        daysUntilTarget += 7;
      }

      nextTime.setDate(nextTime.getDate() + daysUntilTarget);
      return nextTime;
    }

    case "monthly": {
      if (!schedule.dayOfMonth || !schedule.time) return null;
      const [hours, minutes] = schedule.time.split(":").map(Number);

      const nextTime = new Date(afterTime);
      nextTime.setHours(hours, minutes, 0, 0);

      // Get the last day of the current month
      const lastDayOfMonth = new Date(nextTime.getFullYear(), nextTime.getMonth() + 1, 0).getDate();
      // Use the scheduled day or the last day of the month, whichever is smaller
      const actualDay = Math.min(schedule.dayOfMonth, lastDayOfMonth);
      nextTime.setDate(actualDay);

      // If the time this month has passed, move to next month
      if (nextTime <= afterTime) {
        nextTime.setMonth(nextTime.getMonth() + 1);
        // Recalculate for the new month in case it also doesn't have enough days
        const newLastDayOfMonth = new Date(nextTime.getFullYear(), nextTime.getMonth() + 1, 0).getDate();
        const newActualDay = Math.min(schedule.dayOfMonth, newLastDayOfMonth);
        nextTime.setDate(newActualDay);
      }
      return nextTime;
    }

    case "cron": {
      if (!schedule.cronExpression) return null;
      try {
        const options = {
          currentDate: afterTime,
          useSeconds: false,
        };
        const interval = CronExpressionParser.parse(schedule.cronExpression, options);
        return interval.next().toDate();
      } catch (error) {
        console.error("Error parsing cron expression:", error);
        return null;
      }
    }

    default:
      return null;
  }
}

export function isCommandDue(command: ScheduledCommand, now: Date): boolean {
  const nextScheduledTime = getNextScheduledTime(command, new Date(now.getTime() - 60000)); // Look back 1 minute
  if (!nextScheduledTime) return false;
  return isWithinExecutionWindow(nextScheduledTime, now);
}

/**
 * Check if a command was missed (should have run but didn't) since the last check.
 * This is used for the "run if missed" feature.
 * Returns true if the command should be executed to catch up on a missed schedule.
 */
export function wasScheduleMissed(command: ScheduledCommand, now: Date): boolean {
  // Don't run if feature is disabled
  if (!command.runIfMissed) return false;

  // If never executed and never checked for missed, it's not "missed"
  if (!command.lastExecutedAt && !command.lastMissedCheck) return false;

  // Determine the reference time (when we last knew the state)
  const referenceTime = command.lastMissedCheck || command.lastExecutedAt;
  if (!referenceTime) return false;

  const lastKnownTime = new Date(referenceTime);

  // Don't consider it missed if it's currently due (will be handled by normal execution)
  if (isCommandDue(command, now)) return false;

  // Get the next scheduled time after the last known time
  const nextScheduledTime = getNextScheduledTime(command, lastKnownTime);
  if (!nextScheduledTime) return false;

  // If the next scheduled time is in the past (between lastKnownTime and now), it was missed
  return nextScheduledTime > lastKnownTime && nextScheduledTime <= now;
}
