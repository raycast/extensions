import { showToast, Toast } from "@raycast/api";

import { pauseSession, loadSession, saveSession } from "./lib/pomodoro-state";
import { syncAudioForSession } from "./lib/audio";
import { getPomodoroConfig } from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

export default async function Command() {
  const session = await loadSession();

  if (!session) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No active session",
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
