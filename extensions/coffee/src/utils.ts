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

export async function changeIsManuallyDecafed(operation:string) {
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();
  let schedule: Schedule = JSON.parse((await LocalStorage.getItem(currentDayString)) || '{}');

  switch(operation){
    case "caffeinate" : {
      schedule.IsManuallyDecafed = false;
      await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      break;
    }
    case "decaffeinate" : {
      schedule.IsManuallyDecafed = true;
      await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      break
    }

    default : break
  }
}

export function calculateDurationInSeconds(startHour: number, startMinute: number, endHour: number, endMinute: number): number {
  return (endHour - startHour) * 3600 + (endMinute - startMinute) * 60;
}

export function dayStringToNumber(day: string): number {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return daysOfWeek.indexOf(day);
}

export function numberToDayString(dayIndex: number): string {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return daysOfWeek[dayIndex];
}

