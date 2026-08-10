import { Clipboard, showHUD } from "@raycast/api";
import moment from "moment";
import { execSync } from "child_process";
import * as fs from "fs";
import { checkAdbDeviceExists } from "./utils";

export default async function takeScreenshot() {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const now = moment(new Date()).format("DD-MM-YYYY-HH-mm-ss");
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
