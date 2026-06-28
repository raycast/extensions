import { getApplications, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { expandHome } from "./androidCliResolver";

// The command-execution seam lives in its own raycast-free module so it can be
// unit-tested without triggering this module's preference lookups. Re-exported
// here so existing callers (`from "./utils"`) keep working unchanged.
export { executeAsync, runCommand } from "./commandRunner";

export async function isAndroidStudioInstalled() {
  return (await getApplications()).find((app) => {
    (app.name === "Android studio") != undefined ? true : false;
  });
}

export async function listDirectories(folder: string) {
  return fs.promises.readdir(folder, { withFileTypes: true });
}

export const emulatorPath = `ANDROID_AVD_HOME="${androidAVD()}" ${androidSDK()}/emulator/emulator`;

export function androidSDK() {
  const sdk = getPreferenceValues().androidSDK;
  return expandHome(sdk, os.homedir());
}
export function androidAVD() {
  const avd = getPreferenceValues().androidAVD;
  return expandHome(avd, os.homedir());
}

export const adbPath = path.join(androidSDK(), "platform-tools", "adb");

export function isValidDirectory(path: string) {
  try {
    fs.lstatSync(path).isDirectory();
  } catch (error) {
    return false;
  }
  return true;
}

export function hasReadPermission(path: string) {
  let err;
  try {
    fs.accessSync(path, fs.constants.R_OK);
  } catch (error) {
    console.log("%s doesn't have read permission", path);
    err = error;
  }
  return err != null;
}

export async function setTmeoutAsync(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
export function isNumber(value?: string | number): boolean {
  return value != null && value !== "" && !isNaN(Number(value.toString()));
}
