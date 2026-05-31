import { spawn } from "node:child_process";

import { playAlarmForSession, syncAudioForSession } from "./lib/audio";
import {
  getSessionSnapshot,
  loadSession,
  normalizeRestoredSession,
  confirmSessionEnd,
  saveSession,
} from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";
import {
  buildCommandDeeplink,
  cancelTimerScheduler,
  syncTimerScheduler,
} from "./lib/timer-scheduler";

const POMODORO_STATUS_COMMAND = "pomodoro-status";

function openPomodoroStatus(): void {
  const deeplink = buildCommandDeeplink(
    POMODORO_STATUS_COMMAND,
    "userInitiated",
  );
  const child = spawn("open", [deeplink], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
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

  const statusJustElapsed =
    loaded.status === "running" &&
    normalized.status === "awaiting_confirmation";

  if (statusJustElapsed) {
    await syncAudioForSession(normalized, config);
    await cancelTimerScheduler();
    await playAlarmForSession(normalized.id, config);
    openPomodoroStatus();
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
  openPomodoroStatus();
}
