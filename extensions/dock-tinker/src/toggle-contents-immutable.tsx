import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const out = spawnSync("defaults read com.apple.Dock contents-immutable", { shell: true });
  const isTurnOn = String(out.output[1]).trim();

  if (isTurnOn === "1") {
    spawnSync("defaults write com.apple.Dock contents-immutable -bool FALSE && killall Dock", { shell: true });
    await showHUD("Turn off content lock");
  } else {
    spawnSync("defaults write com.apple.Dock contents-immutable -bool TRUE && killall Dock", { shell: true });
    await showHUD("Turn on content lock");
  }
};
