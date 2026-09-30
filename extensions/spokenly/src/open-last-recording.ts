import { showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "fs";
import { getLatestEntry } from "./lib/history";

export default async function main() {
  try {
    const entry = getLatestEntry();
    if (!entry) {
      await showHUD("No recordings yet");
      return;
    }
    if (!existsSync(entry.audioPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Recording file missing",
        message: entry.audioPath,
      });
      return;
    }
    await showInFinder(entry.audioPath);
    await showHUD("Revealing last recording");
  } catch (err) {
    await showFailureToast(err, { title: "Could not open recording" });
  }
}
