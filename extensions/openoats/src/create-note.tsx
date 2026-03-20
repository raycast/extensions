import { closeMainWindow, showToast, Toast } from "@raycast/api";

import { openOpenOatsUrl } from "./lib/openoats-app";
import { makeCreateNoteUrl } from "./lib/openoats";

export default async function Command() {
  await launchOpenOats();
}

async function launchOpenOats() {
  try {
    await closeMainWindow();
    await openOpenOatsUrl(makeCreateNoteUrl());
    await showToast({ style: Toast.Style.Success, title: "OpenOats start requested" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open OpenOats.";
    await showToast({ style: Toast.Style.Failure, title: "OpenOats start failed", message });
  }
}
