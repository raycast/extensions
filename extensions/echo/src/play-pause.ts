import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { EchoError, fetchStatus, playPause } from "./echo";

export default async function PlayPause() {
  try {
    // Read first so the HUD can name what we just did, rather than a bare "Toggled".
    const { nowPlaying } = await fetchStatus();
    if (!nowPlaying) {
      await showHUD("Nothing is playing");
      return;
    }
    await playPause();
    await showHUD(`${nowPlaying.playing ? "Paused" : "Playing"} ${nowPlaying.title}`);
  } catch (e) {
    await showFailureToast(e, { title: e instanceof EchoError ? e.message : "Could not reach Echo" });
  }
}
