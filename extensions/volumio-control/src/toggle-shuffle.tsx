import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { VolumioAPI } from "./volumio-api";

export default async function ToggleShuffle() {
  const api = new VolumioAPI();

  try {
    const state = await api.getPlayerState();
    await api.toggleRandom();

    // The state is checked BEFORE toggle, so if it WAS on, it's now off
    if (state.random) {
      await showHUD("🔀 Shuffle Off");
    } else {
      await showHUD("🔀 Shuffle On");
    }
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to toggle shuffle",
    });
  }
}
