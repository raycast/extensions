import { spawnSync } from "child_process";
import { closeMainWindow, environment, showHUD } from "@raycast/api";
import { homedir } from "os";
import fs from "fs";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const backupPath = environment.supportPath + "/com.apple.dock.plist";
  if (!fs.existsSync(backupPath)) {
    await showHUD("No backups");
    return;
  }
  const plistPath = homedir() + "/Library/Preferences/com.apple.dock.plist";
  if (fs.existsSync(plistPath)) {
    fs.unlinkSync(plistPath);
  }
  fs.copyFileSync(backupPath, plistPath);
  spawnSync("killall Dock", { shell: true });
  await showHUD("Dock state has been restore");
};
