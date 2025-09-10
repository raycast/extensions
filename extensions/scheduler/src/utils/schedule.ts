import { ScheduledCommand } from "../types";
import { parseTimeToDate, isWithinExecutionWindow, convertScheduleDayToJSDay } from "./dateTime";
import { CronExpressionParser } from "cron-parser";

// Helper function to get the last execution time from the command itself
function getLastExecutionTime(command: ScheduledCommand): Date | null {
  return command.lastExecutedAt ? new Date(command.lastExecutedAt) : null;
}

// Helper function to check if enough time has passed since last execution
function hasIntervalPassed(lastExecution: Date | null, intervalMinutes: number, now: Date): boolean {
  if (!lastExecution) return true; // Never executed, so it's due

  const timeSinceLastExecution = now.getTime() - lastExecution.getTime();
  const intervalMs = intervalMinutes * 60 * 1000;

  return timeSinceLastExecution >= intervalMs;
}

const scheduleCheckers = {
  once: (command: ScheduledCommand, now: Date) => {
    if (!command.schedule.date || !command.schedule.time) return false;
    const scheduledDateTime = new Date(`${command.schedule.date}T${command.schedule.time}`);
    return isWithinExecutionWindow(scheduledDateTime, now);
  },

  "15mins": (command: ScheduledCommand, now: Date) => {
    const lastExecution = getLastExecutionTime(command);
    return hasIntervalPassed(lastExecution, 15, now);
  },

  "30mins": (command: ScheduledCommand, now: Date) => {
    const lastExecution = getLastExecutionTime(command);
    return hasIntervalPassed(lastExecution, 30, now);
  },

  hourly: (command: ScheduledCommand, now: Date) => {
    const lastExecution = getLastExecutionTime(command);
    return hasIntervalPassed(lastExecution, 60, now);
  },

  daily: (command: ScheduledCommand, now: Date) => {
    if (!command.schedule.time) return false;
    const scheduledTime = parseTimeToDate(command.schedule.time, now);
    return isWithinExecutionWindow(scheduledTime, now);
  },

  weekly: (command: ScheduledCommand, now: Date) => {
    if (command.schedule.dayOfWeek === undefined || !command.schedule.time) return false;
    const jsDay = convertScheduleDayToJSDay(command.schedule.dayOfWeek);
    const scheduledTime = parseTimeToDate(command.schedule.time, now);
    return now.getDay() === jsDay && isWithinExecutionWindow(scheduledTime, now);
  },

  monthly: (command: ScheduledCommand, now: Date) => {
    if (!command.schedule.dayOfMonth || !command.schedule.time) return false;
    const scheduledTime = parseTimeToDate(command.schedule.time, now);
    return now.getDate() === command.schedule.dayOfMonth && isWithinExecutionWindow(scheduledTime, now);
  },

  cron: (command: ScheduledCommand, now: Date) => {
    if (!command.schedule.cronExpression) return false;

    const options = {
      currentDate: now,
      useSeconds: false,
    };
    try {
      const interval = CronExpressionParser.parse(command.schedule.cronExpression, options);
      const prevRun = interval.prev().toDate();
      return isWithinExecutionWindow(prevRun, now);
    } catch (error) {
      console.error("Error parsing cron expression:", error);
      return false;
    }
  },
};

export function isCommandDue(command: ScheduledCommand, now: Date): boolean {
  const checker = scheduleCheckers[command.schedule.type];
  return checker ? checker(command, now) : false;
}
