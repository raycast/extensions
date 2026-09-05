import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { NightWatchError, toggleNightWatch } from "./night-watch";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling Agent Night Watch…",
  });
  try {
    const result = await toggleNightWatch();
    toast.style = Toast.Style.Success;
    toast.title =
      result === "on"
        ? "☕ Agent Night Watch Enabled"
        : "Agent Night Watch Disabled";
    toast.message =
      result === "on"
        ? "Agents keep running with the lid closed; the display may still turn off."
        : "Closing the lid now restores normal sleep.";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Toggle Agent Night Watch";
    toast.message =
      error instanceof NightWatchError ? error.message : String(error);
  } finally {
    try {
      await launchCommand({
        name: "night-watch-menu",
        type: LaunchType.Background,
      });
    } catch {
      // The menu command may not have been enabled yet during first-time setup.
    }
  }
}
