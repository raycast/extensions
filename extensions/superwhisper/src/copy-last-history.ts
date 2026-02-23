import { Clipboard, Toast, closeMainWindow, showToast } from "@raycast/api";
import { format } from "date-fns";

import { getRecordingPrimaryText, getRecordings } from "./hooks";
import { checkSuperwhisperInstallation } from "./utils";

const LAST_HOUR_IN_MS = 60 * 60 * 1000;

export default async function main() {
  const isInstalled = await checkSuperwhisperInstallation();
  if (!isInstalled) {
    return;
  }

  await closeMainWindow();

  try {
    const recordings = await getRecordings();
    const cutoff = Date.now() - LAST_HOUR_IN_MS;
    const recentRecordings = recordings
      .filter((recording) => recording.timestamp.getTime() >= cutoff)
      .map((recording) => ({
        timestamp: recording.timestamp,
        text: getRecordingPrimaryText(recording.meta),
      }))
      .filter((recording) => recording.text.length > 0)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (recentRecordings.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No recent recordings found",
        message: "No Superwhisper history entries from the last hour.",
      });
      return;
    }

    const content = recentRecordings
      .map((recording) => `[${format(recording.timestamp, "yyyy-MM-dd HH:mm:ss")}]\n${recording.text}`)
      .join("\n\n---\n\n");

    await Clipboard.copy(content);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied last hour history",
      message: `Copied ${recentRecordings.length} recording${recentRecordings.length === 1 ? "" : "s"} to clipboard.`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy history",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
