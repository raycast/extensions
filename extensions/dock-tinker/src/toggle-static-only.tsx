import { spawnSync } from "child_process";
import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  await showToast({ title: "Toggling static only", style: Toast.Style.Animated });
  const out = spawnSync("defaults read com.apple.Dock static-only", { shell: true });
  const isTurnOn = String(out.output[1]).trim();

  if (isTurnOn === "1") {
    spawnSync(`defaults write com.apple.Dock "static-only" -bool "false" && killall Dock`, { shell: true });
    await showHUD("💻 Turn off static-only mode");
  } else {
    spawnSync(`defaults write com.apple.Dock "static-only" -bool "true" && killall Dock`, { shell: true });
    await showHUD("💻 Turn on static-only mode");
  }
};
