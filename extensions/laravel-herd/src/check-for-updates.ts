import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showToast({
    title: "Checking for updates...",
    style: Toast.Style.Animated,
  });

  await rescue(() => Herd.General.checkForUpdates(), "Failed to check for updates.");

  await closeMainWindow();
}
