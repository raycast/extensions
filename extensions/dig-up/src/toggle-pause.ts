// Dig Up: Pause or Resume Indexing. The pause lasts until it's resumed, across restarts (Config.paused).

import { Toast, showHUD, showToast } from "@raycast/api";
import { api } from "./lib/client";
import { refreshMenuBar } from "./ui/menu-bar";
import { preferencesSent } from "./ui/prefs";

export default async function Command() {
  try {
    // Resuming starts indexing, which the preferences govern (hours, battery).
    await preferencesSent();
    const paused = !(await api("GET /config")).paused;
    await api("POST /pause", { paused });
    await showHUD(paused ? "Indexing paused" : "Indexing resumed");
    await refreshMenuBar();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Dig Up couldn't change that",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
