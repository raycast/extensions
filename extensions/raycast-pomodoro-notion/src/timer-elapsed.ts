import { LaunchType, launchCommand } from "@raycast/api";

import { playAlarmForSession, syncAudioForSession } from "./lib/audio";
import {
  getSessionSnapshot,
  loadSession,
  normalizeRestoredSession,
  confirmSessionEnd,
  saveSession,
} from "./lib/pomodoro-state";
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

  const normalized = normalizeRestoredSession(loaded);
  if (normalized.status !== loaded.status) {
    await saveSession(normalized);
  }

  const statusJustElapsed = loaded.status === "running" && normalized.status === "awaiting_confirmation";

  if (statusJustElapsed) {
    await syncAudioForSession(normalized, config);
    await cancelTimerScheduler();
    await playAlarmForSession(normalized.id, config);
    await openPomodoroStatus();
    return;
  }

  if (normalized.status !== "running") {
    await syncTimerScheduler(normalized);
    return;
  }

  const snapshot = getSessionSnapshot(normalized, Date.now());
  if (snapshot.displayStatus !== "awaiting_confirmation") {
    await syncTimerScheduler(normalized);
    return;
  }

  const updated = confirmSessionEnd(normalized);
  await saveSession(updated);
  await syncAudioForSession(updated, config);
  await cancelTimerScheduler();
  await playAlarmForSession(updated.id, config);
  await openPomodoroStatus();
}
