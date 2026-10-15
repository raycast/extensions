// Dig Up: Index Now. Looks for new and changed files in the chosen folders now, instead of waiting for the watcher.

import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { api } from "./lib/client";
import { heldText, hoursText, nothingChosen } from "./lib/status-text";
import { refreshMenuBar } from "./ui/menu-bar";
import { preferencesSent } from "./ui/prefs";

export default async function Command() {
  try {
    // The daemon starts without the preferences; indexing hours and battery rules are among them.
    await preferencesSent();
    const status = await api("GET /status");
    if (nothingChosen(status)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folders chosen yet",
        message: "Choose the folders Dig Up should search.",
        primaryAction: {
          title: "Choose Folders…",
          onAction: () => launchCommand({ name: "folders", type: LaunchType.UserInitiated }),
        },
      });
      return;
    }
    await api("POST /sync", {});
    // Outside the index hours, when indexing starts again (DigUp's "indexing from 1:00 AM").
    const hours = status.heldUntil ? hoursText(status) : null;
    const held = heldText(status.held);
    await showHUD(
      hours
        ? `Looking for changes; ${hours}`
        : held
          ? `Looking for changes; indexing waits: ${held}`
          : "Looking for new and changed files",
    );
    await refreshMenuBar();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Dig Up couldn't start indexing",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
