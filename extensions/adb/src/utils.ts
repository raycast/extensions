import * as fs from "fs";
import { execSync } from "child_process";
import { Cache } from "@raycast/api";

export default async function checkAdbExists() {
  const adb = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;

  if (!fs.existsSync(adb)) {
    throw new Error(`❗️ADB not found here: ${adb}`);
  } else {
    const device = execSync(`${adb} devices`).toString().trim().split("\n");
    if (device.length == 1) {
      throw new Error(`❗No device seem to be connected.`);
    }
    return `${adb} -s ${device[1].split("\t")[0]}`;
  }
}

export function getAppIdFromParamsOrCache(paramAppId: string | undefined): string | undefined {
  const cache = new Cache();
  const cacheAppId = cache.get("appId");
  let appId: string | undefined;
  if (paramAppId != undefined && paramAppId.length > 0) {
    appId = paramAppId;
  } else if (cacheAppId?.length ?? 0 > 0) {
    appId = cacheAppId;
  } else {
    appId = undefined;
  }
  return appId;
}

export function saveAppIdInCache(appId: string) {
  const cache = new Cache();
  cache.set("appId", appId);
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
