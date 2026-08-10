import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VolumioAPI } from "./volumio-api";

export default async function NextTrack() {
  const api = new VolumioAPI();

  try {
    await api.next();
    await showHUD("⏭ Next Track");
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to skip to next track",
    });
  }
}
