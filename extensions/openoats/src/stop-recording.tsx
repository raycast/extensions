import { closeMainWindow, showToast, Toast } from "@raycast/api";

import { openOpenOatsUrl } from "./lib/openoats-app";
import { makeStopRecordingUrl } from "./lib/openoats";

export default async function Command() {
  await stopRecording();
}

async function stopRecording() {
  try {
    await closeMainWindow();
    await openOpenOatsUrl(makeStopRecordingUrl());
    await showToast({ style: Toast.Style.Success, title: "OpenOats stop requested" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open OpenOats.";
    await showToast({ style: Toast.Style.Failure, title: "OpenOats stop failed", message });
  }
}
