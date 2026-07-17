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

  // Save first, then check. checkSchedule() reads today's entry from
  // LocalStorage, so checking before saving (as this previously did) reads
  // stale/missing data — if the request lands inside the new schedule's
  // active window, it would incorrectly save IsRunning: false and delay
  // activation until the next 15s background tick instead of now.
  for (const schedule of newSchedules) {
    await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
  }

  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();
  const isScheduleRunning = await checkSchedule();

  const todaysSchedule = newSchedules.find((schedule) => schedule.day === currentDayString);
  if (todaysSchedule && isScheduleRunning) {
    todaysSchedule.IsRunning = true;
    await LocalStorage.setItem(todaysSchedule.day, JSON.stringify(todaysSchedule));
  }

  const daysFormatted = days.map((day) => day.charAt(0).toUpperCase() + day.slice(1)).join(", ");

  return `Caffeination scheduled for ${daysFormatted} from ${from} to ${to}`;
}
