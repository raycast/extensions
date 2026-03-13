import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VolumioAPI } from "./volumio-api";

export default async function Stop() {
  const api = new VolumioAPI();

  try {
    await api.stop();
    await showHUD("⏹ Stopped");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to stop playback",
    });
  }
}
