import { spawnSync } from "child_process";
import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  await showToast({ title: "Toggling scroll to open", style: Toast.Style.Animated });
  const out = spawnSync("defaults read com.apple.dock scroll-to-open", { shell: true });
  const isTurnOn = String(out.output[1]).trim();

  if (isTurnOn === "1") {
    spawnSync("defaults write com.apple.Dock scroll-to-open -bool FALSE && killall Dock", { shell: true });
    await showHUD("💻 Turn off scroll-to-open mode");
  } else {
    spawnSync("defaults write com.apple.Dock scroll-to-open -bool TRUE && killall Dock", { shell: true });
    await showHUD("💻 Turn on scroll-to-open mode");
  }
};
