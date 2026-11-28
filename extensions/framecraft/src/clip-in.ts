import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { formatHmsDisplay } from "./lib/env";
import { detectActivePlayback } from "./lib/probe";
import { writeClipInState } from "./lib/queue";
import { loadRuntimeConfig } from "./lib/raycast-config";
import { mediaIdentity } from "./lib/source-format";

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
      mediaKey: mediaIdentity(probe),
      markedAt: Date.now(),
    });
    await showHUD(`📍 Marked clip start ${formatHmsDisplay(probe.positionSec)} · ${probe.movieName}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't read playback session" });
  }
}
