import { showHUD, showToast, Toast } from "@raycast/api";
import { execa } from "execa";
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
    await execa("open", ["-R", entry.audioPath]);
    await showHUD("Revealing last recording");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open recording",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
