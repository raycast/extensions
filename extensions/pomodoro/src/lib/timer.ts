import { launchCommand, LaunchType } from "@raycast/api";
import { checkDNDExtensionInstall, setDND } from "./doNotDisturb";
import { continueInterval, createInterval, pauseInterval, resetInterval } from "./intervals";
import { IntervalType } from "./types";

export async function startTimer(type: IntervalType, duration?: number) {
  await checkDNDExtensionInstall();
  const interval = createInterval(type, false, duration);
  await refreshMenuBar();
  return interval;
}

export async function pauseTimer() {
  const interval = pauseInterval();
  await refreshMenuBar();
  return interval;
}

export async function continueTimer() {
  const interval = continueInterval();
  await refreshMenuBar();
  return interval;
}

export async function stopTimer() {
  resetInterval();
  setDND(false);
  await refreshMenuBar();
  return "Timer stopped";
}

async function refreshMenuBar() {
  try {
    await launchCommand({
      name: "pomodoro-menu-bar",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    console.error(error);
  }
}
