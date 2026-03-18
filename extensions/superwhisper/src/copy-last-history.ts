import { Clipboard, Toast, closeMainWindow, getPreferenceValues, showToast } from "@raycast/api";

import { getLatestRecordingByVariant, TranscriptVariant } from "./hooks";
import { checkSuperwhisperInstallation } from "./utils";

export default async function main() {
  const { transcriptVariant } = getPreferenceValues<Preferences.CopyLastHistory>();
  const isInstalled = await checkSuperwhisperInstallation();
  if (!isInstalled) {
    return;
  }

  await closeMainWindow();

  try {
    const latestRecording = await getLatestRecordingByVariant(transcriptVariant as TranscriptVariant);
    const variantTitle = transcriptVariant === "processed" ? "AI processed" : "unprocessed";

    await Clipboard.copy(latestRecording.text);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied last history",
      message: `Copied the most recent ${variantTitle} transcript to the clipboard.`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy history",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
