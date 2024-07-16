import { spawnSync } from "child_process";
import { closeMainWindow, environment, showHUD, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import fs from "fs";

export default async () => {
  await closeMainWindow();
  const backupPath = environment.supportPath + "/com.apple.dock.plist";
  if (!fs.existsSync(backupPath)) {
    await showToast({ title: "No backups", style: Toast.Style.Failure });
    return;
  }
  const plistPath = homedir() + "/Library/Preferences/com.apple.dock.plist";
  if (fs.existsSync(plistPath)) {
    fs.unlinkSync(plistPath);
  }
  fs.copyFileSync(backupPath, plistPath);
  spawnSync("killall Dock", { shell: true });
  await showHUD("💻 Dock state has been restore");
};
