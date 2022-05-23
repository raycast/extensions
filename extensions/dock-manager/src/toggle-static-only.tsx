import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const out = spawnSync("defaults read com.apple.Dock static-only", { shell: true });
  const isTurnOn = String(out.output[1]).trim();

  if (isTurnOn === "1") {
    spawnSync("defaults write com.apple.Dock static-only -bool no && killall Dock", { shell: true });
    await showHUD("Turn off static-only mode");
  } else {
    spawnSync("defaults write com.apple.Dock static-only -bool yes && killall Dock", { shell: true });
    await showHUD("Turn on static-only mode");
  }
};
