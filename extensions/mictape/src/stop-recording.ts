import { launchCommand, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { showError } from "./lib/errors";
import { fileName, formatClock, getStatus, stopRecording } from "./lib/mictape";

export default async function Command() {
  try {
    const status = await getStatus();
    if (!status.recording) {
      await showHUD("Not recording");
      return;
    }
    await showToast({ style: Toast.Style.Animated, title: "Stopping…" });
    const saved = await stopRecording();
    try {
      await launchCommand({ name: "recording-status", type: LaunchType.Background });
    } catch {
      // The menu bar command is not enabled.
    }
    await showHUD(`Saved ${fileName(saved.path)} (${formatClock(saved.duration)})`);
  } catch (error) {
    await showError("Could not stop recording", error);
  }
}
