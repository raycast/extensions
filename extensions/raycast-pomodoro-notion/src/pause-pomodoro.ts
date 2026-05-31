import { Toast, showToast } from "@raycast/api";

import { stopLoopingAudio } from "./lib/audio";
import { loadSession, pauseSession, saveSession } from "./lib/pomodoro-state";
import { syncTimerScheduler } from "./lib/timer-scheduler";

export default async function Command() {
  const session = await loadSession();

  if (!session) {
    await showToast({
      style: Toast.Style.Failure,
      title: "進行中のセッションがありません",
    });
    return;
  }

  if (session.status === "paused") {
    await showToast({
      style: Toast.Style.Success,
      title: "すでに一時停止中です",
    });
    return;
  }

  const updated = pauseSession(session);
  await saveSession(updated);
  await stopLoopingAudio();
  await syncTimerScheduler(updated);

  await showToast({
    style: Toast.Style.Success,
    title: "ポモドーロを一時停止しました",
  });
}
