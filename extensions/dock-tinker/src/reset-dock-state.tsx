import { closeMainWindow, showHUD } from "@raycast/api";
import { spawnSync } from "child_process";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  spawnSync("defaults delete com.apple.dock && killall Dock", { shell: true });
  await showHUD("Dock state has been reset");
};
