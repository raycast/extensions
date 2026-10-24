import { getPreferenceValues, launchCommand, LaunchType, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { Schedule } from "./interfaces";
import {
  windowsGetCaffeinationState,
  windowsStartCaffeinate,
  windowsStopCaffeinate,
  windowsStopCaffeinateIfMatches,
} from "./windowsApi";
import { parseCaffeinateTimeout } from "./duration";
import { getUserStopDecision } from "./userStopPolicy";
import {
  CaffeinationReason,
  CaffeinationState,
  ConditionalStopResult,
  getMacCaffeinationState,
  parseReason,
  startMacCaffeinate,
  stopMacCaffeinate,
  stopMacCaffeinateIfMatches,
} from "./caffeination";

export type { Schedule, CaffeinationReason, CaffeinationState };

type Updates = {
  menubar: boolean;
  status: boolean;
};

const CAFFEINATION_REASON_KEY = "caffeinationReason";

async function setWindowsCaffeinationReason(sessionId: string, reason?: CaffeinationReason) {
  await LocalStorage.setItem(CAFFEINATION_REASON_KEY, JSON.stringify({ sessionId, reason }));
}

async function getWindowsCaffeinationReason(sessionId: string | null): Promise<CaffeinationReason | undefined> {
  const raw = await LocalStorage.getItem<string>(CAFFEINATION_REASON_KEY);
  if (!raw || !sessionId) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("sessionId" in value) || value.sessionId !== sessionId)
      return undefined;
    return "reason" in value ? parseReason(value.reason) : undefined;
  } catch {
    return undefined;
  }
}

export async function getCaffeinationState(): Promise<CaffeinationState> {
  if (process.platform !== "win32") return getMacCaffeinationState();
  const state = await windowsGetCaffeinationState();
  return { ...state, reason: state.isManaged ? await getWindowsCaffeinationReason(state.sessionId) : undefined };
}

/** Apply the same schedule policy before any user-requested stop or optimistic update. */
export async function prepareUserStop() {
  const decision = getUserStopDecision(
    await getSchedule(),
    getPreferenceValues<Preferences>().decaffeinatePausesSchedules,
  );
  if (!decision.allowed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Caffeination schedule running",
      message: "Pause to decaffeinate",
      primaryAction: {
        title: "Open Schedules",
        onAction: () => launchCommand({ name: "addSchedule", type: LaunchType.UserInitiated }),
      },
    });
  }
  return decision;
}

export function stoppedCaffeinationMessage(state: CaffeinationState, schedulePaused = false): string {
  const message = schedulePaused ? "Coffee caffeination stopped (schedule paused)" : "Coffee caffeination stopped";
  return state.externalCount ? `${message}; external caffeination remains active` : message;
}

export async function startCaffeinate(
  updates: Updates,
  hudMessage?: string,
  additionalArgs?: string,
  reason?: CaffeinationReason,
) {
  parseCaffeinateTimeout(additionalArgs?.split(/\s+/).filter(Boolean) ?? []);
  if (process.platform === "win32") {
    const sessionId = await windowsStartCaffeinate(additionalArgs);
    await setWindowsCaffeinationReason(sessionId, reason);
  } else {
    const args = ["-u", ...generateArgs(additionalArgs).split(/\s+/).filter(Boolean)];
    await startMacCaffeinate(args, reason);
  }

  // showHUD closes the window and Raycast 2 unloads view commands, so spawn
  // and persist must finish first. Don't await menu-bar/status refreshes
  // before the HUD — they run in their own processes once launchCommand is called.
  const refresh = update(updates);
  if (hudMessage) {
    await showHUD(hudMessage);
  }
  await refresh;
}

export async function stopCaffeinate(
  updates: Updates,
  showFeedback = false,
  options?: { pauseRunningSchedule?: boolean },
) {
  let pausedSchedule: Schedule | undefined;
  if (options?.pauseRunningSchedule) {
    const schedule = await getSchedule();
    if (schedule && isTodaysSchedule(schedule) && schedule.IsRunning) {
      pausedSchedule = schedule;
      await changeScheduleState("decaffeinate", schedule);
    }
  }
  let state: CaffeinationState;
  try {
    if (process.platform === "win32") {
      await windowsStopCaffeinate();
      state = await getCaffeinationState();
    } else {
      state = await stopMacCaffeinate();
    }
  } catch (e) {
    if (pausedSchedule) {
      pausedSchedule.IsManuallyDecafed = false;
      pausedSchedule.IsRunning = true;
      await LocalStorage.setItem(pausedSchedule.day, JSON.stringify(pausedSchedule));
    }
    throw e;
  }
  // Windows reasons are tied to worker identity. Leave them in place so a
  // concurrent replacement cannot lose its metadata during this stop's cleanup.
  if (process.platform !== "win32") await LocalStorage.removeItem(CAFFEINATION_REASON_KEY);

  const refresh = update(updates);
  if (showFeedback) {
    await showHUD(stoppedCaffeinationMessage(state, Boolean(pausedSchedule)));
  }
  await refresh;
  return state;
}

/** Schedule expiry must not stop a session that replaced the one it observed. */
export async function stopCaffeinateIfMatches(
  updates: Updates,
  expectedSessionId: string,
): Promise<ConditionalStopResult> {
  let result: ConditionalStopResult;
  if (process.platform === "win32") {
    const state = await getCaffeinationState();
    if (state.sessionId !== expectedSessionId || state.reason?.kind !== "schedule") return { stopped: false, state };
    const stopped = await windowsStopCaffeinateIfMatches(expectedSessionId);
    result = { stopped, state: await getCaffeinationState() };
  } else {
    result = await stopMacCaffeinateIfMatches(expectedSessionId);
  }
  // The conditional path deliberately does not clear shared Windows reason
  // metadata: a replacement may already have saved its own bound reason.
  if (result.stopped) await update(updates);
  return result;
}

async function update(updates: Updates) {
  const tasks: Promise<void>[] = [];
  if (updates.menubar) {
    tasks.push(tryLaunchCommand("index", {}));
  }
  if (updates.status) {
    tasks.push(tryLaunchCommand("status", { skipScheduleMonitorHeartbeat: true }));
  }
  await Promise.all(tasks);
}

async function tryLaunchCommand(commandName: string, context: { skipScheduleMonitorHeartbeat?: boolean }) {
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
  if (preferences.preventSleepOnAC) flags.push("s");

  const parts = [];
  if (flags.length > 0) parts.push(`-${flags.join("")}`);
  if (additionalArgs) parts.push(additionalArgs);

  return parts.join(" ");
}

export function deviceName(): "PC" | "Mac" {
  return process.platform === "win32" ? "PC" : "Mac";
}

export async function isCoffeeRunning(): Promise<boolean> {
  return (await getCaffeinationState()).isManaged;
}

export function numberToDayString(dayIndex: number): string {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return daysOfWeek[dayIndex];
}

export async function getSchedule(): Promise<Schedule | undefined> {
  const currentDate = new Date();
  const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();

  const stored = await LocalStorage.getItem(currentDayString);
  return parseSchedule(stored);
}

export function parseSchedule(value: unknown): Schedule | undefined {
  if (typeof value !== "string") return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const schedule = parsed as Record<string, unknown>;
    if (
      typeof schedule.day === "string" &&
      typeof schedule.from === "string" &&
      typeof schedule.to === "string" &&
      typeof schedule.IsManuallyDecafed === "boolean" &&
      typeof schedule.IsRunning === "boolean"
    ) {
      return {
        day: schedule.day,
        from: schedule.from,
        to: schedule.to,
        IsManuallyDecafed: schedule.IsManuallyDecafed,
        IsRunning: schedule.IsRunning,
      };
    }
  } catch {
    // Ignore unrelated local storage values.
  }

  return undefined;
}

export async function changeScheduleState(operation: "caffeinate" | "decaffeinate", schedule: Schedule) {
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
