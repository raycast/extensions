import * as fs from "fs";
import { execSync } from "child_process";
import { Cache, getPreferenceValues } from "@raycast/api";
import expandTilde from "expand-tilde";

export async function checkAdbExists() {
  const sdk = getPreferenceValues().androidSDK;
  const sdkPath = sdk.replace("~", expandTilde("~"));
  const adb = `${sdkPath}/platform-tools/adb`;

  if (!fs.existsSync(adb)) {
    throw new Error(`❗️ADB not found here: ${adb}`);
  } else {
    return adb;
  }
}

export async function checkAdbDeviceExists() {
  const adb = await checkAdbExists();
  const device = execSync(`${adb} devices`).toString().trim().split("\n");
  if (device.length == 1) {
    throw new Error(`❗No device seem to be connected.`);
  }
  return `${adb} -s ${device[1].split("\t")[0]}`;
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
