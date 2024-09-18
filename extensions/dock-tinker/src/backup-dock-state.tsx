import { closeMainWindow, environment, showHUD } from "@raycast/api";
import * as fs from "fs";
import { homedir } from "os";

export default async () => {
  await closeMainWindow();
  const backupPath = environment.supportPath + "/com.apple.dock.plist";
  const plistPath = homedir() + "/Library/Preferences/com.apple.dock.plist";
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
  fs.copyFileSync(plistPath, backupPath);
  await showHUD("💻 Dock state has been backup");
};
