import { LocalStorage, updateCommandMetadata } from "@raycast/api";
import { Schedule, startCaffeinate, getSchedule, stopCaffeinate, isCaffeinateRunning } from "./utils";

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
    await stopCaffeinate({ status: true });
    await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
    return false;
  }

  // If the current time is within scheduled time, start caffeination
  if (isWithinSchedule === true && schedule.IsRunning === false) {
    // Duration must be the time remaining until the schedule's end, not the
    // full start-to-end span — this check doesn't necessarily run exactly at
    // the scheduled start (background interval is 15s, and the PC could have
    // been asleep or Raycast could have just launched), so using the full
    // span would run caffeination well past the intended end time.
    const endTime = new Date(currentDate);
    endTime.setHours(endHour, endMinute, 0, 0);
    const duration = Math.max(1, Math.round((endTime.getTime() - currentDate.getTime()) / 1000));
    await startCaffeinate({ status: true }, undefined, { durationSeconds: duration });
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

export default async function Command() {
  // This runs unattended on a 15s background interval — a transient failure
  // (e.g. a slow WMI query) shouldn't throw and spam errors; just skip this
  // tick and let the next one try again.
  try {
    const isCaffeinated = await isCaffeinateRunning();
    const isScheduled = await checkSchedule();

    const subtitle = isCaffeinated || isScheduled ? "✔ Caffeinated" : "✖ Decaffeinated";
    updateCommandMetadata({ subtitle });
  } catch (error) {
    console.error("Failed to refresh caffeination status:", error);
  }
}
