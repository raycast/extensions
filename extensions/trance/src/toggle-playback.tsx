import { showHUD } from "@raycast/api";
import { togglePlayback, getCurrentState } from "./lib/playback-controller";

export default async function TogglePlaybackCommand() {
  const stateBefore = await getCurrentState();

  if (!stateBefore.isPlaying && stateBefore.activeSounds.length === 0) {
    await showHUD("No sounds in mix — open Mix Sounds to add some");
    return;
  }

  const state = await togglePlayback();

  if (state.isPlaying) {
    await showHUD(`Playing ${state.activeSounds.length} sound${state.activeSounds.length !== 1 ? "s" : ""}`);
  } else {
    await showHUD("Trance paused");
  }
}
