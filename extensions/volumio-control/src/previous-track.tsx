import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VolumioAPI } from "./volumio-api";

export default async function PreviousTrack() {
  const api = new VolumioAPI();

  try {
    await api.previous();
    await showHUD("⏮ Previous Track");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to skip to previous track",
    });
  }
}
