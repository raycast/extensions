import * as fs from "fs";
import { execSync } from "child_process";

export default async function checkAdbExists() {
  const adb = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;

  if (!fs.existsSync(adb)) {
    throw new Error(`❗️ADB not found here: ${adb}`);
  } else {
    const device = execSync(`${adb} devices`).toString().trim().split("\n");
    console.log(device);
    if (device.length == 1) {
      throw new Error(`❗No device seem to be connected.`);
    }
    return `${adb} -s ${device[1].split("\t")[0]}`;
  }
}
