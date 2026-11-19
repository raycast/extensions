import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    // Server URLs embed the API key; keep them out of clipboard history.
    await Clipboard.copy(probe.mediaTarget, { concealed: true });
    await showHUD(`📋 Copied stream URL/path · ${probe.movieName}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't read playback session" });
  }
}
