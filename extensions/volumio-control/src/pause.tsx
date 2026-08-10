import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VolumioAPI } from "./volumio-api";

export default async function Pause() {
  const api = new VolumioAPI();

  try {
    await api.pause();
    await showHUD("⏸ Paused");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to pause playback",
    });
  }
}
