import { LocalStorage } from "@raycast/api";
import { extractSchedule } from "../extractSchedule";
import { numberToDayString } from "../utils";
import { checkSchedule } from "../status";

type Input = {
  /**
   * Schedule description (e.g., "Monday and Tuesday from 09:00 to 17:00")
   */
  schedule: string;
};

/**
 * Creates a new caffeination schedule
 * Example: "Monday and Tuesday from 09:00 to 17:00"
 * Example: "Everyday except weekends from 09:00 to 17:00"
 * Example: "All days from 09:00 to 18:00"
 */
export default async function (input: Input) {
  const parsedSchedule = await extractSchedule(input.schedule);
  if (!parsedSchedule) {
    throw new Error("Invalid schedule format. Please specify days and time range (HH:MM).");
  }

  const { days, from, to } = parsedSchedule;
  const newSchedules = days.map((day) => ({
    day,
    from,
    to,
    IsManuallyDecafed: false,
    IsRunning: false,
  }));

  // Save schedules and check if today's schedule should be running
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();
  const isScheduleRunning = await checkSchedule();

  for (const schedule of newSchedules) {
    if (currentDayString === schedule.day) {
      schedule.IsRunning = isScheduleRunning;
    }
    await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
  }

  const daysFormatted = days.map((day) => day.charAt(0).toUpperCase() + day.slice(1)).join(", ");

  return `Caffeination scheduled for ${daysFormatted} from ${from} to ${to}`;
}
