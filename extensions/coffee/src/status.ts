import { getPreferenceValues, LocalStorage, updateCommandMetadata } from "@raycast/api";
import { Schedule, startCaffeinate, getSchedule, stopCaffeinate, isCaffeinateRunning } from "./utils";

const AUTO_CAFFEINATE_LAST_RUN_KEY = "autoCaffeinateLastRun";
const AUTO_CAFFEINATE_SESSION_GAP_MS = 2 * 60_000;

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
 */
export async function maybeAutoCaffeinate(isScheduled?: boolean): Promise<boolean> {
  // The last-run marker is refreshed on every background tick so the gap below
  // only grows when Raycast is quit (or the Mac is asleep) - i.e. a fresh
  // Raycast session. It must be updated before the early returns, otherwise it
  // goes stale while the Mac is caffeinated and the next decaffeination would
  // look like a fresh session.
  const now = Date.now();
  const lastRun = (await LocalStorage.getItem<number>(AUTO_CAFFEINATE_LAST_RUN_KEY)) ?? 0;
  await LocalStorage.setItem(AUTO_CAFFEINATE_LAST_RUN_KEY, now);

  if (!getPreferenceValues<Preferences>().startCaffeinateOnLaunch) return false;
  if (isCaffeinateRunning()) return false;

  const scheduled = isScheduled ?? (await checkSchedule());
  if (scheduled) return false;

  // A gap larger than the session threshold means Raycast was quit (or the Mac
  // was asleep) since the last background run, i.e. a fresh Raycast session.
  if (now - lastRun < AUTO_CAFFEINATE_SESSION_GAP_MS) return false;

  await startCaffeinate({ menubar: true, status: true });
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
