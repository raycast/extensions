import { showHUD } from "@raycast/api";
import * as fs from "fs";

export default async function checkAdbExists() {
  const adb = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;

  if (!fs.existsSync(adb)) {
    await showHUD(`❗️ADB not found here: ${adb}`);
    process.exit(-1);
  } else {
    return adb;
  }
}
