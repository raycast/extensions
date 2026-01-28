import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VolumioAPI } from "./volumio-api";

export default async function Play() {
  const api = new VolumioAPI();

  try {
    await api.play();
    await showHUD("▶️ Playing");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to start playback",
    });
  }
}
