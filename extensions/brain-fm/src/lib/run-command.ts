import { showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { controlAndVerify } from "./player";
import { PlaybackAction } from "./player-script";

export async function runCommand(action: Exclude<PlaybackAction, "status">): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Controlling Brain.fm…" });
  try {
    const state = await controlAndVerify(action);
    await toast.hide();
    await showHUD(
      action === "skip" || action === "previous"
        ? `Brain.fm: ${state.title || "Track changed"}`
        : `Brain.fm ${state.state === "playing" ? "playing" : "paused"}`,
    );
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: "Could not control Brain.fm" });
  }
}
