import { PreferenceValues, getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import untildify from "untildify";
import { execSync } from "child_process";

export function getAdbDir(): string {
  const preferences = getPreferenceValues<PreferenceValues>();
  const adbDir = preferences["adbDir"];
  if (adbDir) {
    return adbDir;
  }
  const home = process.env.HOME;
  return `${home}/Library/Android/sdk/platform-tools`;
}

export function existsAdb(): boolean {
  const file = `${getAdbDir()}/adb`;
  console.log(file);
  return fs.existsSync(file);
}

export function getDevices() {
  const adbDir = getAdbDir();
  const stdout = execSync(`${adbDir}/adb devices`).toString();
  const devices: string[] = [];
  stdout.split("\n").forEach((line, index) => {
    if (index != 0 && line.length > 0) {
      devices.push(line.split("\t")[0]);
    }
  });
  return devices;
}

export function getScreenshotSaveLocation(): string {
  const preferences = getPreferenceValues();
  const captureFolder = untildify(preferences.captureDir ?? "~/Downloads");
  return captureFolder;
}
