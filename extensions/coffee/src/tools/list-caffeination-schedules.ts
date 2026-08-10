import { LocalStorage } from "@raycast/api";
import { Schedule } from "../interfaces";
import { numberToDayString } from "../utils";

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

function parseSchedule(value: string | number | boolean): Schedule | undefined {
  if (typeof value !== "string") return undefined;

  try {
    const schedule = JSON.parse(value) as Partial<Schedule>;
    if (
      typeof schedule.day === "string" &&
      typeof schedule.from === "string" &&
      typeof schedule.to === "string" &&
      typeof schedule.IsManuallyDecafed === "boolean" &&
      typeof schedule.IsRunning === "boolean"
    ) {
      return schedule as Schedule;
    }
  } catch {
    // Ignore unrelated local storage values.
  }

  return undefined;
}

function dayIndex(day: string): number {
  return Array.from({ length: 7 }, (_, index) => numberToDayString(index).toLowerCase()).indexOf(day.toLowerCase());
}
