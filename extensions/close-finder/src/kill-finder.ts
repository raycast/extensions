import { closeMainWindow, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async () => {
  await runAppleScript('tell application "Finder" to quit');
  await closeMainWindow();
  await showToast({ title: "Finder killed" });
};
