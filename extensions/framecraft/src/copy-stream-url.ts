import { showToast, Toast } from "@raycast/api";
import { Clipboard, showHUD } from "@raycast/api";
import { detectActivePlayback } from "./lib/probe";
import { loadRuntimeConfig } from "./lib/raycast-config";

export default async function Command() {
  try {
    const config = loadRuntimeConfig();
    const probe = await detectActivePlayback(config);

    if (!probe) {
      await showHUD("❌ No stream or local video is playing");
      return;
    }

    await Clipboard.copy(probe.mediaTarget);
    await showHUD(`📋 Copied stream URL/path · ${probe.movieName}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't read playback session",
      message: error instanceof Error ? error.message : "Check your player and Jellyfin/Emby settings",
    });
  }
}
