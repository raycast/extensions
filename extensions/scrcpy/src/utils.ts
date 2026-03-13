import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  adbDir: string;
  scrcpyDir: string;
};

export function getAdbDir(): string {
  const { adbDir } = getPreferenceValues<Preferences>();

  if (adbDir) {
    return adbDir;
  }

  const home = process.env.HOME;
  return `${home}/Library/Android/sdk/platform-tools`;
}

export function getScrcpyDir(): string {
  const { scrcpyDir } = getPreferenceValues<Preferences>();

  return scrcpyDir || (process.arch == "arm64" ? `/opt/homebrew/bin` : `/usr/local/bin`);
}
