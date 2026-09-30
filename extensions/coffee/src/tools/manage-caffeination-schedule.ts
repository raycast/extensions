import { Action, LocalStorage, Tool } from "@raycast/api";
import { checkSchedule } from "../status";
import { Schedule } from "../interfaces";
import { isTodaysSchedule, stopCaffeinate } from "../utils";

type Input = {
  /** Action to perform on the schedule. */
  action: "pause" | "resume" | "delete";
  /** Day whose schedule should be changed, for example "monday". */
  day: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `${capitalize(input.action)} the caffeination schedule for ${capitalize(input.day)}?`,
  style: input.action === "delete" ? Action.Style.Destructive : Action.Style.Regular,
});

/**
 * Pauses, resumes, or deletes the recurring caffeination schedule for one day.
 */
export default async function tool(input: Input) {
  const day = normalizeDay(input.day);
  const storedSchedule = await LocalStorage.getItem<string>(day);
  if (!storedSchedule) {
    throw new Error(`No caffeination schedule exists for ${capitalize(day)}`);
  }

  const schedule = JSON.parse(storedSchedule) as Schedule;

  if (input.action === "delete") {
    if (isTodaysSchedule(schedule) && schedule.IsRunning) {
      await stopCaffeinate({ menubar: true, status: true });
    }
    await LocalStorage.removeItem(day);
    return { action: input.action, day, success: true };
  }

  const wasRunning = schedule.IsRunning;
  schedule.IsManuallyDecafed = input.action === "pause";
  schedule.IsRunning = false;
  if (input.action === "pause" && wasRunning && isTodaysSchedule(schedule)) {
    await stopCaffeinate({ menubar: true, status: true });
  }

  await LocalStorage.setItem(day, JSON.stringify(schedule));

  if (input.action === "resume" && isTodaysSchedule(schedule)) {
    await checkSchedule();
  }

  return {
    action: input.action,
    day,
    paused: schedule.IsManuallyDecafed,
    running: input.action === "resume" && isTodaysSchedule(schedule) ? (await getSchedule(day)).IsRunning : false,
    success: true,
  };
}

async function getSchedule(day: string): Promise<Schedule> {
  const value = await LocalStorage.getItem<string>(day);
  if (!value) throw new Error(`No caffeination schedule exists for ${capitalize(day)}`);
  return JSON.parse(value) as Schedule;
}

function normalizeDay(day: string): string {
  const normalized = day.trim().toLowerCase();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (!days.includes(normalized)) {
    throw new Error(`Invalid day "${day}". Use a weekday name such as Monday.`);
  }
  return normalized;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
