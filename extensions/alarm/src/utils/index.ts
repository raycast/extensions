import { LocalStorage, getPreferenceValues } from "@raycast/api";

import { exec } from "child_process";

enum StorageKeys {
  alarms = "alarms",
}

/**
 * Converts a number of seconds to a string representation of the time.
 * @param seconds The number of seconds to convert.
 * @param showSeconds Whether or not to show seconds in the string.
 * @returns A string representation of the time.
 * @example
 * secondsToString(50) // "50s"
 * secondsToString(50, false) // "<1m"
 */
export function secondsToString(seconds: number, showSeconds = true) {
  let timeString = "";
  if (seconds > 60 * 60) {
    const hours = Math.floor(seconds / (60 * 60));
    timeString += `${hours}h`;
    seconds -= hours * 60 * 60;
  }
  if (seconds > 60) {
    const minutes = Math.floor(seconds / 60);
    timeString += `${minutes}m`;
    seconds -= minutes * 60;
  }
  if (showSeconds && seconds > 0) {
    timeString += `${seconds}s`;
  } else if (!showSeconds && timeString === "") timeString = "<1m";
  return timeString;
}

export async function getTimers() {
  let timers: Timer[] = [];
  await LocalStorage.getItem<string>(StorageKeys.alarms).then((timerString) => {
    if (timerString && timerString[0] === "[")
      timers = (JSON.parse(timerString) as Timer[]).filter(({ timeMS }) => timeMS > Date.now());
  });
  return timers;
}

export async function addTimer(timer: Timer) {
  const timers = await getTimers();
  await LocalStorage.setItem(
    StorageKeys.alarms,
    JSON.stringify([...timers.filter(({ timeMS }) => timeMS > Date.now()), timer] as Timer[])
  );
}

export async function removeTimer(timerId: number) {
  const timers = await getTimers();
  await LocalStorage.setItem(
    StorageKeys.alarms,
    JSON.stringify([...timers.filter(({ id }) => id !== timerId)] as Timer[])
  );
}

export async function updateTimer(id: number, data: Partial<Timer>) {
  const timers = await getTimers();
  const timer = timers.find((timer) => timer.id === id);
  if (timer) {
    await LocalStorage.setItem(
      StorageKeys.alarms,
      JSON.stringify([...timers.filter(({ id }) => id !== timer.id), { ...timer, ...data }] as Timer[])
    );
  }
}

/**
 * Creates a system notification
 * @param timeInSeconds The number of seconds to wait before showing the notification.
 * @param timerName The name of the timer that will be shown in the notification.
 * @returns The process ID of the notification.
 */
export function createNotification(timeInSeconds: number, timerName: string): number {
  const preferences = getPreferenceValues<Preferences>();
  const notificationTitle = "⏰ Alarm finished: " + timerName;
  const notification = preferences.alertEnabled
    ? `display dialog "${notificationTitle}" buttons {"OK"} default button "OK"`
    : `display notification "${notificationTitle}" with title "Alarm Clock" sound name "Funk"`;
  const process = exec(`sleep ${timeInSeconds} && osascript -e '${notification}'`);
  if (!process.pid) throw new Error("Unable to create notification");
  return process.pid;
}
