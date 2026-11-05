import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { recordingUrl, type RecordingAction } from "./recording-links";
const openInBackground = promisify(execFile);

export async function requestRecording(action: RecordingAction) {
  await closeMainWindow();
  try {
    // Keep Launch Services from activating Tiro before it handles background=true.
    await openInBackground("/usr/bin/open", ["-g", recordingUrl(action)]);
    await showToast({
      style: Toast.Style.Success,
      title: "Request sent to Tiro",
      message: "Check the Tiro desktop app. Ending a live note requires version 4.12.1 or later.",
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Tiro",
      message: "Install the Tiro desktop app and sign in, then try again.",
    });
  }
}
