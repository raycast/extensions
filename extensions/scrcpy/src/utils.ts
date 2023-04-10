import { getPreferenceValues, PreferenceValues } from "@raycast/api";

export function getAdbDir(): string {
  const preferences = getPreferenceValues<PreferenceValues>();
  const adbDir = preferences["adbDir"];
  if (adbDir) {
    return adbDir;
  }

  const home = process.env.HOME;
  return `${home}/Library/Android/sdk/platform-tools`;
}

export function getScrcpyDir(): string {
  const preferences = getPreferenceValues<PreferenceValues>();
  const scrcpyDir = preferences["scrcpyDir"];
  if (scrcpyDir) {
    return scrcpyDir;
  }

  return `/usr/local/bin`;
}
