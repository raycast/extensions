import { LaunchType, launchCommand } from "@raycast/api";

import { playAlarmForSession, syncAudioForSession } from "./lib/audio";
import { getSessionSnapshot, loadSession } from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";
import { cancelTimerScheduler, syncTimerScheduler } from "./lib/timer-scheduler";

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

  // Play the alarm at the planned end, but keep status running so overtime work keeps counting.
  await syncAudioForSession(loaded, config);
  await cancelTimerScheduler();
  await playAlarmForSession(loaded.id, config);
  await openPomodoroStatus();
}
