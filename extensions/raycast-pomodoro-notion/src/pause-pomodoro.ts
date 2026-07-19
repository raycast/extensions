import { showToast, Toast } from "@raycast/api";

import { pauseSession, loadSession, saveSession, normalizeRestoredSession } from "./lib/pomodoro-state";
import { syncAudioForSession } from "./lib/audio";
import { getPomodoroConfig } from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

export default async function Command() {
  const loaded = await loadSession();

  if (!loaded) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No active session",
    });
    return;
  }

  const session = normalizeRestoredSession(loaded);

  if (session !== loaded) {
    await saveSession(session);
  }

  if (session.status === "awaiting_confirmation") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Session ended",
      message: "Open Pomodoro Status to save your work log",
    });
    return;
  }

  if (session.status === "paused") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Session is already paused",
    });
    return;
  }

  const config = getPomodoroConfig();
  const paused = pauseSession(session);
  await saveSession(paused);
  await syncAudioForSession(paused, config);
  await syncTimerScheduler(paused);

  await showToast({
    style: Toast.Style.Success,
    title: "Pomodoro paused",
  });
}
