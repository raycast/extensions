import { getPreferenceValues, LocalStorage, updateCommandMetadata } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { Schedule, startCaffeinate, getSchedule, stopCaffeinate, isCaffeinateRunning } from "./utils";

const AUTO_CAFFEINATE_PID_KEY = "autoCaffeinateRaycastPid";

/**
 * Returns a session identifier for the currently-running Raycast instance.
 *
 * Primary: `lsappinfo` queries Raycast's start time via LaunchServices using
 * the bundle ID — immune to process-table visibility restrictions that cause
 * `pgrep` to return nothing from within the extension context.
 *
 * Fallback: `process.ppid` (the Raycast Helper PID) which is stable within a
 * session in production builds, though it may vary across commands in dev mode.
 */
function getRaycastSessionId(): string {
  try {
    const out = execFileSync("/usr/bin/lsappinfo", ["info", "-app", "com.raycast.macos"], { encoding: "utf8" }).trim();

    const pidMatch = out.match(/pid\s*=\s*(\d+)/);
    if (pidMatch?.[1]) {
      return `pid:${pidMatch[1]}`;
    }

    const dateMatch = out.match(/\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/);
    if (dateMatch?.[0]) {
      return `launch:${dateMatch[0]}`;
    }
  } catch {
    // lsappinfo unavailable or Raycast not registered yet — fall through.
  }
  return `ppid:${process.ppid}`;
}

async function handleScheduledCaffeinate(schedule: Schedule): Promise<boolean> {
  if (!schedule || Object.keys(schedule).length === 0) {
    return false;
  }

  const currentDate = new Date();
  const [startHour, startMinute] = schedule.from.split(":").map(Number);
  const [endHour, endMinute] = schedule.to.split(":").map(Number);
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();

  const isWithinSchedule =
    (currentHour > startHour || (currentHour === startHour && currentMinute >= startMinute)) &&
    (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute));

  // Change isRunning to false when the schedule has finished its run
  if (isWithinSchedule === false && schedule.IsRunning === true) {
    schedule.IsRunning = false;
    await stopCaffeinate({ menubar: true, status: true });
    await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
    return false;
  }

  // If the current time is within scheduled time, start caffeination
  if (isWithinSchedule === true && schedule.IsRunning === false) {
    const duration = (endHour - startHour) * 3600 + (endMinute - startMinute) * 60;
    await startCaffeinate({ menubar: true, status: true }, undefined, `-t ${duration}`);
    schedule.IsRunning = true;
    await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
    return true;
  }

  return false;
}

// Function to check and handle schedule
export async function checkSchedule() {
  const schedule = await getSchedule();

  if (schedule === undefined) return false;

  if (!schedule.IsManuallyDecafed) {
    const isScheduled = await handleScheduledCaffeinate(schedule);
    return isScheduled;
  }

  return false;
}

/**
 * Starts caffeination (indefinitely) once per Raycast session when the
 * "Start caffeination when Raycast starts" preference is enabled and the Mac
 * is not already caffeinated or covered by a schedule. Returns true when
 * caffeination was started.
 *
 * Session detection is keyed off the Raycast launch time stored in
 * LocalStorage. The session ID changes only when Raycast actually relaunches, so
 * sleep/wake cycles (where background intervals simply don't fire but the ID
 * stays the same) cannot trigger a spurious auto-caffeinate.
 */
export async function maybeAutoCaffeinate(isScheduled?: boolean): Promise<boolean> {
  const currentSessionId = getRaycastSessionId();
  const storedSessionId = await LocalStorage.getItem<string>(AUTO_CAFFEINATE_PID_KEY);

  // Always refresh the stored session ID so it reflects the running Raycast process.
  // This must happen before the early returns so that after a manual decaf the
  // marker stays current and won't look like a new session on the next tick.
  await LocalStorage.setItem(AUTO_CAFFEINATE_PID_KEY, currentSessionId);

  if (!getPreferenceValues<Preferences>().startCaffeinateOnLaunch) return false;
  if (isCaffeinateRunning()) return false;

  const scheduled = isScheduled ?? (await checkSchedule());
  if (scheduled) return false;

  // A different (or absent) session ID means Raycast relaunched — treat as new session.
  // Sleep/wake does not change the session ID, so it cannot trigger a false positive.
  if (currentSessionId === storedSessionId) return false;

  await startCaffeinate({ menubar: true, status: true }, "Auto-caffeinating your Mac");
  return true;
}

export default async function Command() {
  const isCaffeinated = isCaffeinateRunning();
  const isScheduled = await checkSchedule();
  const autoStarted = await maybeAutoCaffeinate(isScheduled);

  let subtitle = "✖ Decaffeinated";

  if (isCaffeinated || isScheduled || autoStarted) {
    subtitle = "✔ Caffeinated";
  }

  updateCommandMetadata({ subtitle });
}
