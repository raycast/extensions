import { spawnSync } from "child_process";
import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  await showToast({ title: "Toggling show recents", style: Toast.Style.Animated });
  const out = spawnSync(`defaults read com.apple.Dock "show-recents"`, { shell: true });
  const isTurnOn = String(out.output[1]).trim();
  const newState = isTurnOn === "1" ? "false" : "true";
  const newStateText = isTurnOn === "1" ? "off" : "on";

  spawnSync(`defaults write com.apple.Dock "show-recents" -bool "${newState}" && killall Dock`, { shell: true });
  await showHUD(`💻 Turn ${newStateText} show recents`);
};
