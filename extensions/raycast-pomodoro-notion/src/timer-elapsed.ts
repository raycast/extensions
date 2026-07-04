import { LaunchType, launchCommand } from "@raycast/api";

import { playAlarmForSession, stopLoopingAudio } from "./lib/audio";
import { getSessionSnapshot, loadSession } from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";
import {
  cancelTimerScheduler,
  hasTimerElapsedBeenNotified,
  markTimerElapsedNotified,
  syncTimerScheduler,
} from "./lib/timer-scheduler";

const POMODORO_STATUS_COMMAND = "pomodoro-status";

async function openPomodoroStatus(): Promise<void> {
  await launchCommand({
    name: POMODORO_STATUS_COMMAND,
    type: LaunchType.UserInitiated,
  });
}

export default async function Command() {
  const config = getPomodoroConfig();
  const loaded = await loadSession();

  if (!loaded) {
    await cancelTimerScheduler();
    return;
  }

  if (loaded.status !== "running") {
    await syncTimerScheduler(loaded);
    return;
  }

  const snapshot = getSessionSnapshot(loaded, Date.now());
  if (snapshot.displayStatus !== "awaiting_confirmation") {
    await syncTimerScheduler(loaded);
    return;
  }

  if (await hasTimerElapsedBeenNotified(loaded.id)) {
    await cancelTimerScheduler();
    return;
  }

  await markTimerElapsedNotified(loaded.id);

  // Stop ambient loop audio before the alarm while keeping the session running for overtime tracking.
  await stopLoopingAudio();
  await cancelTimerScheduler();
  await playAlarmForSession(loaded.id, config);
  await openPomodoroStatus();
}
