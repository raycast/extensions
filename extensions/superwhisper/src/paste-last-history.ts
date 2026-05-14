import { Clipboard, Toast, closeMainWindow, getPreferenceValues, showToast } from "@raycast/api";

import { getLatestRecordingByVariant, TranscriptVariant } from "./hooks";
import { checkSuperwhisperInstallation } from "./utils";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function main() {
  const { transcriptVariant } = getPreferenceValues<Preferences.PasteLastHistory>();
  const isInstalled = await checkSuperwhisperInstallation();
  if (!isInstalled) {
    return;
  }

  try {
    const latestRecording = await getLatestRecordingByVariant(transcriptVariant as TranscriptVariant);
    const variantTitle = transcriptVariant === "processed" ? "AI processed" : "unprocessed";

    await closeMainWindow();
    await wait(150);

    try {
      await Clipboard.paste(latestRecording.text);
      await showToast({
        style: Toast.Style.Success,
        title: "Pasted last history",
        message: `Pasted the most recent ${variantTitle} transcript into the active app.`,
      });
      return;
    } catch {
      await Clipboard.copy(latestRecording.text);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied last history",
        message: `Could not paste the most recent ${variantTitle} transcript, so it was copied to clipboard instead.`,
      });
      return;
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to paste history",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
