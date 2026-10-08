import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { glimpse, RecordStatus } from "./glimpse";
import { refreshMenuBar } from "./recording";

export default async function Command() {
  try {
    // record status never launches Glimpse, so an idle app stays closed.
    const current = await glimpse<RecordStatus>(["record", "status"]);
    if (current.status === "saving") {
      await showHUD("Saving recording…");
      return;
    }
    if (!current.app_running || current.status === "idle") {
      await showHUD("No recording is in progress");
      return;
    }
    const pausing = current.status === "recording";
    await glimpse<RecordStatus>(["record", pausing ? "pause" : "resume"]);
    await refreshMenuBar();
    await showHUD(pausing ? "Recording paused" : "Recording resumed");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't pause or resume recording" });
  }
}
