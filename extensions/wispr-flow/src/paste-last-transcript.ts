import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { dbExists, getDbPath } from "./db";
import { getLatestTranscriptText } from "./history";

export default async function main() {
  const dbPath = getDbPath();
  const { minimumDuration } = getPreferenceValues<Preferences>();
  const minDuration = Number(minimumDuration) || 0;

  if (!dbExists()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Wispr Flow database not found",
      message: dbPath,
    });
    return;
  }

  try {
    const latestTranscriptText = await getLatestTranscriptText(
      dbPath,
      minDuration,
    );

    if (!latestTranscriptText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No transcript to paste",
        message: "No non-archived transcript with text was found.",
      });
      return;
    }

    await closeMainWindow();
    await Clipboard.paste(latestTranscriptText);
    await showToast({
      style: Toast.Style.Success,
      title: "Latest transcript pasted",
      message: "Pasted to active app",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to paste transcript",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
