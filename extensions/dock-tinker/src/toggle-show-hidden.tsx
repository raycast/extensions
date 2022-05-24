import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const out = spawnSync("defaults read com.apple.Dock showhidden", { shell: true });
  const isTurnOn = String(out.output[1]).trim();

  if (isTurnOn === "1") {
    spawnSync("defaults write com.apple.Dock showhidden -bool no && killall Dock", { shell: true });
    await showHUD("Turn off show-hidden mode");
  } else {
    spawnSync("defaults write com.apple.Dock showhidden -bool yes && killall Dock", { shell: true });
    await showHUD("Turn on show-hidden mode");
  }
};
