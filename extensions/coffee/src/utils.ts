import { getPreferenceValues, launchCommand, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { execSync, spawn } from "node:child_process";
import { Schedule } from "./interfaces";
import { windowsIsCaffeinateRunning, windowsStartCaffeinate, windowsStopCaffeinate } from "./windowsApi";

export type { Schedule };

type Updates = {
  menubar: boolean;
  status: boolean;
};

export type CaffeinationReason =
  | { kind: "while"; appName: string }
  | { kind: "for"; endsAt: string }
  | { kind: "until"; until: string }
  | { kind: "schedule"; day: string; from: string; to: string };

const CAFFEINATION_REASON_KEY = "caffeinationReason";

async function setCaffeinationReason(reason?: CaffeinationReason) {
  if (!reason) {
    await LocalStorage.removeItem(CAFFEINATION_REASON_KEY);
    return;
  }
  await LocalStorage.setItem(CAFFEINATION_REASON_KEY, JSON.stringify(reason));
}

export async function getCaffeinationReason(): Promise<CaffeinationReason | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(CAFFEINATION_REASON_KEY);
    if (!raw) return undefined;
    const reason = JSON.parse(raw) as CaffeinationReason;
    const validWhile = reason.kind === "while" && typeof reason.appName === "string";
    const validFor = reason.kind === "for" && typeof reason.endsAt === "string";
    const validUntil = reason.kind === "until" && typeof reason.until === "string";
    const validSchedule =
      reason.kind === "schedule" &&
      typeof reason.day === "string" &&
      typeof reason.from === "string" &&
      typeof reason.to === "string";
    return validWhile || validFor || validUntil || validSchedule ? reason : undefined;
  } catch {
    return undefined;
  }
}

export async function startCaffeinate(
  updates: Updates,
  hudMessage?: string,
  additionalArgs?: string,
  reason?: CaffeinationReason,
) {
  if (hudMessage) {
    await showHUD(hudMessage);
  }
  await stopCaffeinate({ menubar: false, status: false });

  if (process.platform === "win32") {
    await windowsStartCaffeinate(additionalArgs);
  } else {
    const args = ["-u", ...generateArgs(additionalArgs).split(/\s+/).filter(Boolean)];
    const child = spawn("/usr/bin/caffeinate", args, { detached: true, stdio: "ignore" });
    child.unref();
  }

  await setCaffeinationReason(reason);
  await update(updates, true);
}

export async function stopCaffeinate(
  updates: Updates,
  hudMessage?: string,
  options?: { pauseRunningSchedule?: boolean },
) {
  if (hudMessage) {
    await showHUD(hudMessage);
  }
  let pausedSchedule: Schedule | undefined;
  if (options?.pauseRunningSchedule) {
    const schedule = await getSchedule();
    if (schedule && isTodaysSchedule(schedule) && schedule.IsRunning) {
      pausedSchedule = schedule;
      await changeScheduleState("decaffeinate", schedule);
    }
  }
  try {
    if (process.platform === "win32") {
      await windowsStopCaffeinate();
    } else {
      execSync("/usr/bin/killall caffeinate || true");
    }
  } catch (e) {
    if (pausedSchedule) {
      pausedSchedule.IsManuallyDecafed = false;
      pausedSchedule.IsRunning = true;
      await LocalStorage.setItem(pausedSchedule.day, JSON.stringify(pausedSchedule));
    }
    throw e;
  }
  await setCaffeinationReason(undefined);
  await update(updates, false);
}

async function update(updates: Updates, caffeinated: boolean) {
  if (updates.menubar) {
    await tryLaunchCommand("index", { caffeinated });
  }
  if (updates.status) {
    await tryLaunchCommand("status", { caffeinated, skipScheduleMonitorHeartbeat: true });
  }
}

async function tryLaunchCommand(
  commandName: string,
  context: { caffeinated: boolean; skipScheduleMonitorHeartbeat?: boolean },
) {
  try {
    await launchCommand({ name: commandName, type: LaunchType.Background, context });
  } catch {
    // Command might not be enabled
  }
}

function generateArgs(additionalArgs?: string) {
  const preferences = getPreferenceValues<Preferences>();
  const flags = [];

  if (preferences.preventDisplay) flags.push("d");
  if (preferences.preventDisk) flags.push("m");
  if (preferences.preventSystem) flags.push("i");

  const parts = [];
  if (flags.length > 0) parts.push(`-${flags.join("")}`);
  if (additionalArgs) parts.push(additionalArgs);

  return parts.join(" ");
}

export function deviceName(): "PC" | "Mac" {
  return process.platform === "win32" ? "PC" : "Mac";
}

export async function isCaffeinateRunning(): Promise<boolean> {
  if (process.platform === "win32") {
    return await windowsIsCaffeinateRunning();
  }
  try {
    execSync("pgrep caffeinate");
    return true;
  } catch {
    return false;
  }
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

export function parseSchedule(value: string | number | boolean): Schedule | undefined {
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
