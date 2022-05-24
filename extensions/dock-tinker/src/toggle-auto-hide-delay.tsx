import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const out = spawnSync("defaults read com.apple.Dock autohide-time-modifier", { shell: true });
  const isTurnOn = String(out.output[1]).trim();

  if (isTurnOn === "0") {
    spawnSync("defaults write com.apple.Dock autohide-time-modifier -float 1 && killall Dock", { shell: true });
    await showHUD("Turn on autohide time modifier");
  } else {
    spawnSync("defaults write com.apple.Dock autohide-time-modifier -float 0 && killall Dock", { shell: true });
    await showHUD("Turn off autohide time modifier");
  }
};
