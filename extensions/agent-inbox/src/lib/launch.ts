import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function openSessionCommand(name: "inbox" | "all-sessions"): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, {
      title: name === "inbox" ? "Could not open Subscriptions" : "Could not open All Sessions",
    });
  }
}
