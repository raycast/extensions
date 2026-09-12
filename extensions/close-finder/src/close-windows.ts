import { closeMainWindow, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async () => {
  await runAppleScript('tell application "Finder" to close every window');
  await closeMainWindow();
  await showToast({ title: "Finder windows closed" });
};
