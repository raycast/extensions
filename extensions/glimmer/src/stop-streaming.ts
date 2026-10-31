import { Alert, confirmAlert, open, showHUD, showToast, Toast } from "@raycast/api";
import { buildURL } from "./lib/contract";
import { errorMessage, MissingCLIError, stopLiveStream } from "./lib/glimmer";

export default async function StopStreaming() {
  try {
    if (
      !(await confirmAlert({
        title: "Stop streaming?",
        message:
          "Glimmer follows your ‘Leave games running when you disconnect’ setting. If it’s off, the game will quit and unsaved progress may be lost.",
        primaryAction: { title: "Stop streaming", style: Alert.ActionStyle.Destructive },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      }))
    ) {
      return;
    }
    try {
      const result = await stopLiveStream();
      await showHUD(result.stopped ? "Stream stopped." : "Nothing is streaming.");
    } catch (error) {
      if (!(error instanceof MissingCLIError)) throw error;
      try {
        await open(buildURL("stop"));
      } catch {
        throw new Error(
          "Glimmer CLI is not installed and the stop link could not open. Install Glimmer and try again.",
        );
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Stop requested via URL — CLI not installed",
        message: "The result cannot be verified. Check Glimmer.",
      });
    }
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Couldn’t stop streaming", message: errorMessage(error) });
  }
}
