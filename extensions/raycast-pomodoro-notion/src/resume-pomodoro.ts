import { showToast, Toast } from "@raycast/api";

import { resumeSession, loadSession, saveSession } from "./lib/pomodoro-state";
import { syncAudioForSession } from "./lib/audio";
import { getPomodoroConfig } from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

export default async function Command() {
  const session = await loadSession();

  if (!session) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No session to resume",
    });
    return;
  }

  if (session.status !== "paused") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Session is not paused",
    });
    return;
  }

  const config = getPomodoroConfig();
  const resumed = resumeSession(session);
  await saveSession(resumed);
  await syncAudioForSession(resumed, config, { restart: true });
  await syncTimerScheduler(resumed);

  await showToast({
    style: Toast.Style.Success,
    title: "Pomodoro resumed",
  });
}
