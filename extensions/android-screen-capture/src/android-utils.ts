import { PreferenceValues, getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import untildify from "untildify";
import { execFileSync } from "child_process";

export function getAdbDir(): string {
  const preferences = getPreferenceValues<PreferenceValues>();
  const adbDir = preferences["adbDir"];
  if (adbDir) {
    return untildify(adbDir);
  }
  const home = process.env.HOME;
  // Android Studio's SDK first, then Homebrew's android-platform-tools (Apple silicon, Intel)
  const candidates = [`${home}/Library/Android/sdk/platform-tools`, "/opt/homebrew/bin", "/usr/local/bin"];
  return candidates.find((dir) => fs.existsSync(`${dir}/adb`)) ?? candidates[0];
}

export function existsAdb(): boolean {
  const file = `${getAdbDir()}/adb`;
  console.log(file);
  return fs.existsSync(file);
}

export function getDevices() {
  const adbDir = getAdbDir();
  const stdout = execFileSync(`${adbDir}/adb`, ["devices"]).toString();
  const devices: string[] = [];
  stdout.split("\n").forEach((line, index) => {
    if (index != 0 && line.length > 0) {
      devices.push(line.split("\t")[0]);
    }
  });
  return devices;
}

// Wraps a value in single quotes so a path with spaces stays one shell word
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function getScreenshotSaveLocation(): string {
  const preferences = getPreferenceValues();
  const captureFolder = untildify(preferences.captureDir ?? "~/Downloads");
  return captureFolder;
}
