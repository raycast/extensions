import { Toast, showToast } from "@raycast/api";

import { syncAudioForSession } from "./lib/audio";
import { loadSession, resumeSession, saveSession } from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

export default async function Command() {
  const session = await loadSession();

  if (!session) {
    await showToast({
      style: Toast.Style.Failure,
      title: "再開するセッションがありません",
    });
    return;
  }

  if (session.status !== "paused") {
    await showToast({
      style: Toast.Style.Success,
      title: "現在のセッションは一時停止中ではありません",
    });
    return;
  }

  const updated = resumeSession(session);
  await saveSession(updated);
  await syncAudioForSession(updated, getPomodoroConfig(), { restart: true });
  await syncTimerScheduler(updated);

  await showToast({
    style: Toast.Style.Success,
    title: "ポモドーロを再開しました",
  });
}
