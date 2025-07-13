import { getPreferenceValues, launchCommand, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { exec, execSync } from "node:child_process";

type Preferences = {
  preventDisplay: boolean;
  preventDisk: boolean;
  preventSystem: boolean;
  icon: string;
};

type Updates = {
  menubar: boolean;
  status: boolean;
};

export interface Schedule {
  day: string;
  from: string;
  to: string;
  IsManuallyDecafed: boolean;
  IsRunning: boolean;
}

export async function startCaffeinate(updates: Updates, hudMessage?: string, additionalArgs?: string) {
  if (hudMessage) {
    await showHUD(hudMessage);
  }
  await stopCaffeinate({ menubar: false, status: false });
  exec(`/usr/bin/caffeinate ${generateArgs(additionalArgs)} || true`);
  await update(updates, true);
}

export async function stopCaffeinate(updates: Updates, hudMessage?: string) {
  if (hudMessage) {
    await showHUD(hudMessage);
  }
  execSync("/usr/bin/killall caffeinate || true");
  await update(updates, false);
}

async function update(updates: Updates, caffeinated: boolean) {
  if (updates.menubar) {
    await tryLaunchCommand("index", { caffeinated });
  }
  if (updates.status) {
    await tryLaunchCommand("status", { caffeinated });
  }
}

async function tryLaunchCommand(commandName: string, context: { caffeinated: boolean }) {
  try {
    await launchCommand({ name: commandName, type: LaunchType.Background, context });
  } catch (error) {
    // Handle error if command is not enabled
  }
}

function generateArgs(additionalArgs?: string) {
  const preferences = getPreferenceValues<Preferences>();
  const args = [];

  if (preferences.preventDisplay) args.push("d");
  if (preferences.preventDisk) args.push("m");
  if (preferences.preventSystem) args.push("i");
  if (additionalArgs) args.push(` ${additionalArgs}`);

  return args.length > 0 ? `-${args.join("")}` : "";
}

export function numberToDayString(dayIndex: number): string {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return daysOfWeek[dayIndex];
}

export async function getSchedule() {
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();

  const getSchedule: string | undefined = await LocalStorage.getItem(currentDayString);
  if (getSchedule === undefined) return undefined;

  const schedule: Schedule = JSON.parse(getSchedule);
  return schedule;
}

export async function changeScheduleState(operation: string, schedule: Schedule) {
  switch (operation) {
    case "caffeinate": {
      schedule.IsManuallyDecafed = false;
      schedule.IsRunning = false;
      await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      break;
    }
    case "decaffeinate": {
      if (schedule.IsRunning === true || isNotTodaysSchedule(schedule)) {
        schedule.IsManuallyDecafed = true;
        schedule.IsRunning = false;
        await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      }
      break;
    }

    default:
      break;
  }
}

export function isTodaysSchedule(schedule: Schedule) {
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();

  if (schedule.day === currentDayString) return true;
  else return false;
}

export function isNotTodaysSchedule(schedule: Schedule) {
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();

  if (schedule.day === currentDayString) return false;
  else return true;
}

/*
Example usage:
console.log(formatDuration(1337000)); // Output: "15d 11h 23m 20s"
console.log(formatDuration(3600));    // Output: "1h"
console.log(formatDuration(65));      // Output: "1m 5s"
console.log(formatDuration(86400));   // Output: "1d"
*/
export function formatDuration(seconds: number): string {
  const units = [
    { label: "d", value: 86400 },
    { label: "h", value: 3600 },
    { label: "m", value: 60 },
    { label: "s", value: 1 },
  ];

  const result: string[] = [];

  for (const unit of units) {
    const amount = Math.floor(seconds / unit.value);
    seconds %= unit.value;
    if (amount > 0) {
      result.push(`${amount}${unit.label}`);
    }
  }

  return result.join(" ");
}
