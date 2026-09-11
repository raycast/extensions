import { LocalStorage } from "@raycast/api";
import { Schedule } from "../interfaces";
import { numberToDayString, parseSchedule } from "../utils";

/**
 * Lists all recurring caffeination schedules in weekday order.
 */
export default async function tool() {
  const storedItems = await LocalStorage.allItems();
  const schedules = Object.values(storedItems)
    .map(parseSchedule)
    .filter((schedule): schedule is Schedule => schedule !== undefined)
    .sort((a, b) => dayIndex(a.day) - dayIndex(b.day));

  return {
    schedules: schedules.map((schedule) => ({
      day: schedule.day,
      from: schedule.from,
      to: schedule.to,
      paused: schedule.IsManuallyDecafed,
      running: schedule.IsRunning,
    })),
    count: schedules.length,
  };
}

function dayIndex(day: string): number {
  return Array.from({ length: 7 }, (_, index) => numberToDayString(index).toLowerCase()).indexOf(day.toLowerCase());
}
