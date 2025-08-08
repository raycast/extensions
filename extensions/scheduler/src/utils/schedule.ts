import { ScheduledCommand } from "../types";
import { parseTimeToDate, isWithinExecutionWindow, convertScheduleDayToJSDay } from "./dateTime";

const scheduleCheckers = {
  once: (command: ScheduledCommand, now: Date) => {
    if (!command.schedule.date || !command.schedule.time) return false;
    const scheduledDateTime = new Date(`${command.schedule.date}T${command.schedule.time}`);
    return isWithinExecutionWindow(scheduledDateTime, now);
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
};

export function isCommandDue(command: ScheduledCommand, now: Date): boolean {
  const checker = scheduleCheckers[command.schedule.type];
  return checker ? checker(command, now) : false;
}
