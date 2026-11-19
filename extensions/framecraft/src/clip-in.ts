import { showToast, Toast } from "@raycast/api";
import { showHUD } from "@raycast/api";
import { formatHmsDisplay } from "./lib/env";
import { detectActivePlayback } from "./lib/probe";
import { writeClipInState } from "./lib/queue";
import { loadRuntimeConfig } from "./lib/raycast-config";

export default async function Command() {
  try {
    const config = loadRuntimeConfig();
    const probe = await detectActivePlayback(config);

    if (!probe) {
      await showHUD("❌ No video is playing");
      return;
    }

    writeClipInState(config.supportPath, {
      startSec: probe.positionSec,
      movieName: probe.movieName,
      mediaTarget: probe.mediaTarget,
      markedAt: Date.now(),
    });

    await showHUD(`📍 Marked A point ${formatHmsDisplay(probe.positionSec)} · ${probe.movieName}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't read playback session",
      message: error instanceof Error ? error.message : "Check your player and Jellyfin/Emby settings",
    });
  }
}
