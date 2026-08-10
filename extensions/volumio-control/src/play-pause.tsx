import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VolumioAPI } from "./volumio-api";

export default async function PlayPause() {
  const api = new VolumioAPI();

  try {
    const state = await api.getPlayerState();
    await api.toggle();

    if (state.status === "play") {
      await showHUD("⏸ Paused");
    } else {
      await showHUD("▶️ Playing");
    }
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to toggle playback",
    });
  }
}
