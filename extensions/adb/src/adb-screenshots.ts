import { Clipboard, showHUD } from "@raycast/api";
import moment from "moment";
import { execSync } from "child_process";
import * as fs from "fs";

export default async function takeScreenshot() {
  const now = moment(new Date()).format("DD-MM-YYYY-HH-mm-ss");
  const adbDir = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
  const screenshotsDirectory = `${process.env.HOME}/adb-screenshots`;
  const filepath = `${screenshotsDirectory}/${now}.png`;
  if (!fs.existsSync(screenshotsDirectory)) {
    fs.mkdirSync(screenshotsDirectory);
  }
  await showHUD("📸 Saving: " + filepath);

  execSync(`${adbDir} exec-out screencap -p > ${filepath}`);
  const fileContent: Clipboard.Content = {
    file: filepath,
  };
  await Clipboard.copy(fileContent);
  await showHUD("✅ Saved: " + filepath);
}
