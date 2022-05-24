import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const out = spawnSync("defaults read com.apple.dock single-app", { shell: true });
  const isTurnOn = String(out.output[1]).trim();

  if (isTurnOn === "1") {
    spawnSync("defaults write com.apple.dock single-app -bool FALSE && killall Dock", { shell: true });
    await showHUD("Turn off single-app mode");
  } else {
    spawnSync("defaults write com.apple.dock single-app -bool TRUE && killall Dock", { shell: true });
    await showHUD("Turn on single-app mode");
  }
};
