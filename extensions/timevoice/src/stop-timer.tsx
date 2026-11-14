import { showHUD } from "@raycast/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { formatDuration, getRunningEntries, refreshMenuBar, stopEntry, timevoice } from "./api";

async function stopTimer() {
  try {
    const [running] = await getRunningEntries();
    if (!running) {
      await showHUD("No timer is running");
      return;
    }

    const stopped = await stopEntry(running.id);
    await refreshMenuBar();
    await showHUD(`Stopped ${stopped.description || "timer"} · ${formatDuration(stopped.duration_seconds ?? 0)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not stop the timer" });
  }
}

export default withAccessToken(timevoice)(stopTimer);
