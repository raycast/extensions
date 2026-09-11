import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { latestRecordWithTranscript, loadHistoryRecords } from "./history";
import { getHistoryDirectoryPath } from "./utils";

export default async function Command() {
  try {
    const records = loadHistoryRecords();
    const latest = latestRecordWithTranscript(records);

    if (!latest) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No transcription found",
        message: "No transcript text is available in your history yet.",
      });
      return;
    }

    await Clipboard.copy(latest.transcript);
    await showHUD("Copied last transcription");
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unable to load history from ${getHistoryDirectoryPath()}`;
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy last transcription",
      message,
    });
  }
}
