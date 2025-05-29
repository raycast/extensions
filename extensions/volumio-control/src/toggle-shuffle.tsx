import { showToast, Toast, showHUD } from "@raycast/api";
import { VolumioAPI } from "./volumio-api";

export default async function ToggleShuffle() {
  const api = new VolumioAPI();

  try {
    const state = await api.getPlayerState();
    await api.toggleRandom();

    if (state.random) {
      await showHUD("🔀 Shuffle Off");
    } else {
      await showHUD("🔀 Shuffle On");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle shuffle",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
